package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"mime"
	"net/http"
	"net/smtp"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// Function to sanitize email for folder name
func sanitizeEmail(email string) string {
	// Convert to lowercase
	email = strings.ToLower(email)
	// Replace '@' with '_at_', '.' with '_dot_'
	email = strings.ReplaceAll(email, "@", "_at_")
	email = strings.ReplaceAll(email, ".", "_dot_")
	// Remove any other special characters (except underscores)
	re := regexp.MustCompile(`[^a-zA-Z0-9_]+`)
	email = re.ReplaceAllString(email, "_")
	return email
}

type UserDetails struct {
	Email           string `json:"email" bson:"email"`
	FullName        string `json:"full_name,omitempty" bson:"full_name,omitempty"`
	Age             int    `json:"age,omitempty" bson:"age,omitempty"`
	Address         string `json:"address,omitempty" bson:"address,omitempty"`
	Phone           string `json:"phone,omitempty" bson:"phone,omitempty"`
	FatherName      string `json:"father_name,omitempty" bson:"father_name,omitempty"`
	MotherName      string `json:"mother_name,omitempty" bson:"mother_name,omitempty"`
	ParentContact   string `json:"parent_contact,omitempty" bson:"parent_contact,omitempty"`
	SchoolName      string `json:"school_name,omitempty" bson:"school_name,omitempty"`
	Grade           string `json:"grade,omitempty" bson:"grade,omitempty"`
	AdmissionNo     string `json:"admission_no,omitempty" bson:"admission_no,omitempty"`
	PhotoPath       string `json:"photo_path,omitempty" bson:"photo_path,omitempty"`
	CertificatePath string `json:"certificate_path,omitempty" bson:"certificate_path,omitempty"`
	PaymentPath     string `json:"payment_path,omitempty" bson:"payment_path,omitempty"`
	PaymentStatus   string `json:"payment_status" bson:"payment_status"`
}

// User structure
type User struct {
	Username string `json:"username" bson:"username"`
	Email    string `json:"email" bson:"email"`
	Password string `json:"password" bson:"password"`
	OTP      string `json:"otp,omitempty" bson:"otp,omitempty"`
	Role     string `json:"role" bson:"role"`
	LoggedIn string `json:"LoggedIn" bson:"loggedIn"`
}
type LeaderboardEntry struct {
	Username string `bson:"username"`
	Points   int    `bson:"points"`
}

var otpStorage = make(map[string]string)
var otpMutex sync.Mutex

// MongoDB collection
var userCollection *mongo.Collection
var detailsCollection *mongo.Collection
var coursesCollection *mongo.Collection
var assignmentsCollection *mongo.Collection
var leaderboardCollection *mongo.Collection
var quizCollection *mongo.Collection
var submissionCollection *mongo.Collection

// Initialize MongoDB connection
func init() {
	clientOptions := options.Client().ApplyURI("mongodb://localhost:27017")
	client, err := mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		log.Fatalf("MongoDB Connection Error: %v", err)
	}
	err = client.Ping(context.TODO(), nil)
	if err != nil {
		log.Fatalf("MongoDB Ping Error: %v", err)
	}
	fmt.Println("Connected to MongoDB!")
	userCollection = client.Database("User2").Collection("users")
	detailsCollection = client.Database("User2").Collection("details")
	coursesCollection = client.Database("User2").Collection("courses")
	assignmentsCollection = client.Database("User2").Collection("assignments")
	leaderboardCollection = client.Database("User2").Collection("leaderboard")
	quizCollection = client.Database("User2").Collection("quiz")
	submissionCollection = client.Database("User2").Collection("submissions")

	// Ensure base upload directory exists
	os.MkdirAll("uploads", os.ModePerm)
}

// Function to hash passwords
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func AddUserDetails(c *gin.Context) {
	// Manually extract form-data (since ShouldBind doesn't support files)
	email := c.PostForm("email")
	fullName := c.PostForm("full_name")
	age := c.PostForm("age")
	address := c.PostForm("address")
	phone := c.PostForm("phone")
	fatherName := c.PostForm("father_name")
	motherName := c.PostForm("mother_name")
	parentContact := c.PostForm("parent_contact")
	schoolName := c.PostForm("school_name")
	grade := c.PostForm("grade")
	admissionNo := c.PostForm("admission_no")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}
	// Convert email to folder-friendly format (replace @ and .)
	emailFolder := sanitizeEmail(email)
	userFolder := filepath.Join("uploads", emailFolder)
	if err := os.MkdirAll(userFolder, os.ModePerm); err != nil {
		log.Printf("Error creating user directory: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user folder", "details": err.Error()})
		return
	}
	// Handle file uploads
	photo, err1 := c.FormFile("photo")
	certificate, err2 := c.FormFile("certificate")
	payment, err3 := c.FormFile("payment")
	if err1 != nil || err2 != nil || err3 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo and certificate are required"})
		return
	}
	photoPath := filepath.Join(userFolder, "photo.jpg")
	certPath := filepath.Join(userFolder, "certificate.pdf")
	paymentPath := filepath.Join(userFolder, "payment.jpg")
	if err := c.SaveUploadedFile(photo, photoPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
		return
	}
	if err := c.SaveUploadedFile(certificate, certPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save certificate"})
		return
	}
	if err := c.SaveUploadedFile(payment, paymentPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save payment"})
		return
	}
	// Save details to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	userDetails := bson.M{
		"email":            email,
		"full_name":        fullName,
		"age":              age,
		"address":          address,
		"phone":            phone,
		"father_name":      fatherName,
		"mother_name":      motherName,
		"parent_contact":   parentContact,
		"school_name":      schoolName,
		"grade":            grade,
		"admission_no":     admissionNo,
		"photo_path":       photoPath,
		"certificate_path": certPath,
		"payment_path":     paymentPath,
		"payment_status":   "Pending",
	}
	_, err := detailsCollection.InsertOne(ctx, userDetails)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save user details"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User details added successfully!", "folder": userFolder})
}

func UpdateUserDetails(c *gin.Context) {
	email := c.PostForm("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}
	// Extract other fields (except email, photo, and certificate)
	updateData := bson.M{}
	if fullName := c.PostForm("full_name"); fullName != "" {
		updateData["full_name"] = fullName
	}
	if age := c.PostForm("age"); age != "" {
		updateData["age"], _ = strconv.Atoi(age)
	}
	if address := c.PostForm("address"); address != "" {
		updateData["address"] = address
	}
	if phone := c.PostForm("phone"); phone != "" {
		updateData["phone"] = phone
	}
	if fatherName := c.PostForm("father_name"); fatherName != "" {
		updateData["father_name"] = fatherName
	}
	if motherName := c.PostForm("mother_name"); motherName != "" {
		updateData["mother_name"] = motherName
	}
	if parentContact := c.PostForm("parent_contact"); parentContact != "" {
		updateData["parent_contact"] = parentContact
	}
	if schoolName := c.PostForm("school_name"); schoolName != "" {
		updateData["school_name"] = schoolName
	}
	if grade := c.PostForm("grade"); grade != "" {
		updateData["grade"] = grade
	}
	if admissionNo := c.PostForm("admission_no"); admissionNo != "" {
		updateData["admission_no"] = admissionNo
	}
	if len(updateData) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}
	// Update in MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"email": email}
	update := bson.M{"$set": updateData}
	_, err := detailsCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user details"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User details updated successfully"})
}

func GetUserDetails(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	email := c.Param("email")          // Get email from URL parameter
	_, err := url.QueryUnescape(email) // Decode %40 to @
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
		return
	}

	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}
	// Find user by email (case-insensitive)
	var userDetails bson.M
	filter := bson.M{"email": bson.M{"$regex": "^" + email + "$", "$options": "i"}}
	err = detailsCollection.FindOne(ctx, filter).Decode(&userDetails)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User details not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user details", "details": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"details": userDetails})
}

func VerifyPayment(c *gin.Context) {
	email := c.Param("email")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"email": email}
	update := bson.M{"$set": bson.M{"payment_status": "Verified"}}

	result, err := detailsCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update payment status"})
		return
	}

	if result.ModifiedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found or already verified"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment status updated to Verified"})
}

// Register User
func Register(c *gin.Context) {
	var input User
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if user already exists
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existingUser User
	err := userCollection.FindOne(ctx, bson.M{"username": input.Username}).Decode(&existingUser)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}
	// Hash the password before storing
	hashedPassword, err := HashPassword(input.Password)
	if err != nil {
		fmt.Println("User not found in DB:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	// Save user to MongoDB
	newUser := User{
		Username: input.Username,
		Email:    input.Email,
		Password: hashedPassword,
		Role:     "student",
		LoggedIn: "False",
	}
	_, err = userCollection.InsertOne(ctx, newUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User registered successfully!"})
	leaderboardEntry := bson.M{"username": input.Username, "points": 0}
	_, err = leaderboardCollection.InsertOne(ctx, leaderboardEntry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize leaderboard entry"})
		return
	}
}

var jwtKey = []byte("your_secret_key") // Change this to a secure key
type Claims struct {
	Email string `json:"email"`
	jwt.StandardClaims
}

func Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	var user User
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// Find user by email
	err := userCollection.FindOne(ctx, bson.M{"email": input.Email}).Decode(&user)
	if err != nil || !CheckPasswordHash(input.Password, user.Password) {
		fmt.Println("User not found in DB:", err)
		fmt.Println("Querying for email:", input.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	expirationTime := time.Now().Add(7 * 24 * time.Hour) // Token valid for 7 days
	claims := Claims{
		Email: user.Email,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	// Update login status in DB
	_, err = userCollection.UpdateOne(ctx, bson.M{"email": input.Email}, bson.M{"$set": bson.M{"loggedIn": "true"}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update login status"})
		return
	}
	// Send token to frontend
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful!",
		"token":   tokenString,
	})
}

func VerifyToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil {
		return nil, err
	}
	// Extract claims properly
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token required"})
		return
	}
	// Extract token from "Bearer <token>"
	authParts := strings.Split(authHeader, " ")
	if len(authParts) != 2 || authParts[0] != "Bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
		return
	}
	tokenString := authParts[1]
	// Verify and parse the JWT token
	claims, err := VerifyToken(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
		return
	}
	// Extract email from claims
	email := claims.Email
	if email == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token data"})
		return
	}
	// Update user's login status in MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = userCollection.UpdateOne(ctx, bson.M{"email": email}, bson.M{"$set": bson.M{"loggedIn": "false"}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update logout status"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully!"})
}

func GetEmailFromSession(c *gin.Context) (string, error) {
	email, err := c.Cookie("session")
	if err != nil {
		return "", err
	}
	return email, nil
}

var secretKey = []byte("your_secret_key")

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")
		// Check if the header is missing or not formatted correctly
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Missing token"})
			c.Abort()
			return
		}
		// Extract the token from "Bearer <token>"
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		// Parse and validate JWT
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return secretKey, nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Invalid token"})
			c.Abort()
			return
		}
		// Extract email from token claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Invalid claims"})
			c.Abort()
			return
		}
		// Check token expiration
		if float64(time.Now().Unix()) > claims["exp"].(float64) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Token expired"})
			c.Abort()
			return
		}
		// Store email in context for further use
		c.Set("email", claims["email"])
		// Proceed with the request
		c.Next()
	}
}

func CheckLoginStatus(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"loggedIn": false, "error": "Unauthorized: Missing token"})
		return
	}
	// Extract token from "Bearer <token>"
	authParts := strings.Split(authHeader, " ")
	if len(authParts) != 2 || authParts[0] != "Bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"loggedIn": false, "error": "Unauthorized: Invalid token format"})
		return
	}
	tokenString := authParts[1]
	// Verify token and extract claims
	claims, err := VerifyToken(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"loggedIn": false, "error": "Unauthorized: Invalid or expired token"})
		return
	}
	// Extract email from claims
	email := claims.Email
	if email == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"loggedIn": false, "error": "Unauthorized: Invalid token data"})
		return
	}
	// Check if the user exists in the database
	var user User
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err = userCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"loggedIn": false, "error": "Unauthorized: User not found"})
		return
	}
	// Return success response
	c.JSON(http.StatusOK, gin.H{"loggedIn": user.LoggedIn, "email": email})
}

func getusername(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"Username": "nil", "error": "Unauthorized: Missing token"})
		return
	}
	// Extract token from "Bearer <token>"
	authParts := strings.Split(authHeader, " ")
	if len(authParts) != 2 || authParts[0] != "Bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"Username": "nil", "error": "Unauthorized: Invalid token format"})
		return
	}
	tokenString := authParts[1]
	// Verify token and extract claims
	claims, err := VerifyToken(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"Username": "nil", "error": "Unauthorized: Invalid or expired token"})
		return
	}
	// Extract email from claims
	email := claims.Email
	if email == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"Username": "nil", "error": "Unauthorized: Invalid token data"})
		return
	}
	// Check if the user exists in the database
	var user User
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err = userCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"Username": "nil", "error": "Unauthorized: User not found"})
		return
	}
	// Return success response
	c.JSON(http.StatusOK, gin.H{"loggedIn": user.Username, "email": email})
}

// Generate OTP
func GenerateOTP() string {
	return strconv.Itoa(100000 + rand.Intn(900000))
}

// Send OTP via email
func SendOTP(email, otp string) error {
	from := "webpage.krctc.project@gmail.com"
	password := "umzy cqxf odzr qeyj"
	to := []string{email}
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	message := []byte("Subject: Your OTP Code\n\nYour OTP is: " + otp)
	auth := smtp.PlainAuth("", from, password, smtpHost)
	return smtp.SendMail(smtpHost+":"+smtpPort, auth, from, to, message)
}

func RequestOTP1(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	otp := GenerateOTP()
	// Store OTP temporarily in memory
	otpMutex.Lock()
	otpStorage[input.Email] = otp
	otpMutex.Unlock()
	// Send OTP via email
	if err := SendOTP(input.Email, otp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send OTP"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "OTP sent successfully!"})
}
func GetAllStudents(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// Find all students
	cursor, err := detailsCollection.Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students", "details": err.Error()})
		return
	}
	defer cursor.Close(ctx)
	var students []bson.M // Use bson.M instead of UserDetails struct
	if err := cursor.All(ctx, &students); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode students", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, students)
}

// Verify OTP
func VerifyOTP1(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	otpMutex.Lock()
	storedOTP, exists := otpStorage[input.Email]
	otpMutex.Unlock()
	if !exists || storedOTP != input.OTP {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid OTP"})
		return
	}
	// OTP Verified Successfully - Remove it from storage
	otpMutex.Lock()
	delete(otpStorage, input.Email)
	otpMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "OTP verified successfully!"})
}

func userm(c *gin.Context) {
	email, err := GetEmailFromSession(c)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"loggedIn": false, "em": email})
		return
	}
	c.JSON(http.StatusOK, gin.H{"loggedIn": email})
}

func CheckUserRole(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	var user User
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := userCollection.FindOne(ctx, bson.M{"email": input.Email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	// c.JSON(http.StatusOK, gin.H{"role": user.Role})
	c.JSON(http.StatusOK, gin.H{"isAdmin": user.Role == "admin"})
}

type Course struct {
	ID        string   `json:"id,omitempty" bson:"_id,omitempty"`
	Name      string   `json:"name" bson:"name"`
	Resources []string `json:"resources,omitempty" bson:"resources,omitempty"`
	Notes     []string `json:"notes,omitempty" bson:"notes,omitempty"` // Store text notes
}

func createCourse(c *gin.Context) {
	var course Course
	if err := c.ShouldBindJSON(&course); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	_, err := coursesCollection.InsertOne(context.TODO(), course)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add course"})
		return
	}

	// Create resource directory for the course
	courseDir := filepath.Join("uploads", "courses", course.Name, "resources")
	if err := os.MkdirAll(courseDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create course directory"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Course created successfully"})
}

func uploadResource(c *gin.Context) {
	courseName := c.Param("course")

	// Check if course exists
	var course Course
	err := coursesCollection.FindOne(context.TODO(), bson.M{"name": courseName}).Decode(&course)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Increase max upload size (optional)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 10<<20) // 10MB limit

	// Parse uploaded file
	file, handler, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File upload error"})
		return
	}
	defer file.Close()

	// Validate HTML files explicitly
	ext := filepath.Ext(handler.Filename)
	if ext == ".html" || ext == ".htm" {
		log.Println("Uploading an HTML file:", handler.Filename)
	}

	// Create directory for course resources
	courseDir := filepath.Join("uploads", "courses", courseName, "resources")
	if err := os.MkdirAll(courseDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create course directory"})
		return
	}

	// Save file locally
	fileName := handler.Filename
	filePath := filepath.Join(courseDir, fileName)

	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	defer dst.Close()

	// Ensure full file write
	if _, err = io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write file"})
		return
	}

	// Update DB with correct file path
	_, err = coursesCollection.UpdateOne(context.TODO(),
		bson.M{"name": courseName},
		bson.M{"$push": bson.M{"resources": fileName}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update course resources"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Resource uploaded successfully", "file": fileName})
}

func uploadTextNote(c *gin.Context) {
	courseName := c.Param("course")

	// Check if course exists
	var course Course
	err := coursesCollection.FindOne(context.TODO(), bson.M{"name": courseName}).Decode(&course)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Get the note content from request
	var note struct {
		Name    string `json:"name"`    // Note filename
		Content string `json:"content"` // Multi-line text content
	}
	if err := c.ShouldBindJSON(&note); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if note.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Note name is required"})
		return
	}

	// Create the notes directory for the specific course
	notesDir := filepath.Join("uploads", "courses", courseName, "notes")
	if err := os.MkdirAll(notesDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notes directory"})
		return
	}

	// Define note file path (saving as .txt)
	noteFilePath := filepath.Join(notesDir, note.Name+".txt")

	// Write the content as plain text (not JSON)
	err = os.WriteFile(noteFilePath, []byte(note.Content), 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save note"})
		return
	}

	// Update database with the note entry (store the file name without extension)
	_, err = coursesCollection.UpdateOne(context.TODO(),
		bson.M{"name": courseName},
		bson.M{"$push": bson.M{"notes": note.Name + ".txt"}})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update course notes in database"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Note added successfully", "note": note.Name + ".txt"})
}

func downloadNotes(c *gin.Context) {
	courseName := c.Param("course")
	noteName := c.Param("note")

	// Construct the file path for the note
	noteFilePath := filepath.Join("uploads", "courses", courseName, "notes", noteName)

	// Check if the note file exists
	if _, err := os.Stat(noteFilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	// Read the note file content
	fileContent, err := os.ReadFile(noteFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read note file"})
		return
	}

	// Create a PDF document
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetFont("Arial", "", 12)
	pdf.AddPage()

	// Add title
	pdf.Ln(10)

	// Add the note content to the PDF (as plain text)
	content := string(fileContent)

	// Here we ensure the content is added to the PDF as plain text
	pdf.MultiCell(0, 10, content, "", "L", false)

	// Set the response headers for downloading the PDF file
	c.Header("Content-Disposition", "attachment; filename="+noteName+".pdf")
	c.Header("Content-Type", "application/pdf")

	// Write the PDF to the response
	err = pdf.Output(c.Writer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF"})
		return
	}
}

// Get all courses
func getCourses(c *gin.Context) {

	cursor, err := coursesCollection.Find(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch courses"})
		return
	}
	defer cursor.Close(context.TODO())

	var courses []Course
	for cursor.Next(context.TODO()) {
		var course Course
		if err := cursor.Decode(&course); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Decoding error"})
			return
		}
		courses = append(courses, course)
	}

	c.JSON(http.StatusOK, courses)
}

func getCourseResources(c *gin.Context) {
	courseName := c.Param("course")
	var course Course

	// Fetch course details from MongoDB
	err := coursesCollection.FindOne(context.TODO(), bson.M{"name": courseName}).Decode(&course)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Read all notes from the "notes" directory
	notesDir := filepath.Join("uploads", "courses", courseName, "notes")
	var notes []string

	if files, err := os.ReadDir(notesDir); err == nil {
		for _, file := range files {
			if !file.IsDir() && strings.HasSuffix(file.Name(), ".txt") {
				notes = append(notes, file.Name()) // Store note filenames
			}
		}
	}

	// Ensure resources field exists, return empty list if nil
	if course.Resources == nil {
		course.Resources = []string{}
	}

	// Respond with course resources and notes
	c.JSON(http.StatusOK, gin.H{
		"resources": course.Resources,
		"notes":     notes,
	})
}

func downloadResource(c *gin.Context) {
	courseName := c.Param("course")
	resourceName := c.Param("resource")

	filePath := filepath.Join("uploads", "courses", courseName, "resources", resourceName)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
		return
	}

	// Detect MIME type
	mimeType := mime.TypeByExtension(filepath.Ext(filePath))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	c.Header("Content-Type", mimeType)

	// Force correct serving for HTML files
	if filepath.Ext(resourceName) == ".html" {
		c.Header("Content-Type", "text/html")
		c.Header("Content-Disposition", "inline") // Serve inline for browser display
	} else {
		c.Header("Content-Disposition", "attachment; filename="+resourceName)
	}

	c.File(filePath)
}

// assiginments
type Assignment struct {
	CourseName     string `json:"course"`
	AssignmentName string `json:"name"`
	Description    string `json:"description"`
	DueDate        string `json:"due_date"`
	PDFPath        string `json:"pdf,omitempty"`
}

func createAssignment(c *gin.Context) {
	courseName := c.Param("course")
	assignmentName := c.PostForm("name")
	description := c.PostForm("description")
	dueDate := c.PostForm("due_date")

	if courseName == "" || assignmentName == "" || description == "" || dueDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	// ✅ Check if the course exists
	var course bson.M
	err := coursesCollection.FindOne(context.TODO(), bson.M{"name": courseName}).Decode(&course)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// ✅ Create assignment directory
	assignmentDir := filepath.Join("uploads", "courses", courseName, "assignments", assignmentName)
	if err := os.MkdirAll(assignmentDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assignment directory"})
		return
	}

	// 📂 **Handle PDF Upload (Optional)**
	var pdfPath string
	file, _, err := c.Request.FormFile("pdf")
	if err == nil { // If PDF is uploaded
		pdfPath = filepath.Join(assignmentDir, "assignment.pdf")
		dst, err := os.Create(pdfPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save PDF"})
			return
		}
		defer dst.Close()
		io.Copy(dst, file)
	}

	// ✅ Store assignment in DB
	assignment := Assignment{
		CourseName:     courseName,
		AssignmentName: assignmentName,
		Description:    description,
		DueDate:        dueDate,
		PDFPath:        pdfPath,
	}
	_, err = assignmentsCollection.InsertOne(context.TODO(), assignment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save assignment in DB"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Assignment created successfully", "pdf": pdfPath})
}

func uploadAssignment(c *gin.Context) {
	studentName := c.Param("student")
	courseName := c.Param("course")
	assignmentName := c.Param("assignment")

	// 📂 Parse uploaded file
	file, handler, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File upload error"})
		return
	}
	defer file.Close()

	// ✅ Validate file type (PDF or code files)
	allowedExtensions := []string{".pdf", ".cpp", ".py", ".java", ".txt", ".js"}
	ext := strings.ToLower(filepath.Ext(handler.Filename))
	isValid := false
	for _, allowedExt := range allowedExtensions {
		if ext == allowedExt {
			isValid = true
			break
		}
	}
	if !isValid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Allowed: PDF, C++, Python, Java, JS, Text"})
		return
	}

	// ✅ Create student assignment directory
	studentDir := filepath.Join("uploads", "students", studentName, courseName, "assignments", assignmentName)
	if err := os.MkdirAll(studentDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create student directory"})
		return
	}

	// ✅ Save the uploaded file
	filePath := filepath.Join(studentDir, handler.Filename)
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	defer dst.Close()
	io.Copy(dst, file)

	// ✅ Check if the assignment exists
	filter := bson.M{"coursename": courseName, "assignmentname": assignmentName}
	var existingAssignment bson.M
	err = assignmentsCollection.FindOne(context.TODO(), filter).Decode(&existingAssignment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found in database"})
		return
	}

	// ✅ Update MongoDB - Add submission to assignment
	update := bson.M{"$push": bson.M{
		"submissions": bson.M{
			"student":  studentName,
			"filePath": filePath,
			"grade":    "Not Graded",
			"feedback": "",
		},
	}}

	result, err := assignmentsCollection.UpdateOne(context.TODO(), filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update assignment with submission"})
		return
	}

	// ✅ Debugging output
	if result.ModifiedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment found but not updated. Check field names."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Assignment submitted successfully", "file": handler.Filename})
}

func checkAssignmentSubmission(c *gin.Context) {
	studentName := c.Param("student")
	courseName := c.Param("course")
	assignmentName := c.Param("assignment")

	// Find assignment in DB
	filter := bson.M{"coursename": courseName, "assignmentname": assignmentName}
	var existingAssignment bson.M
	err := assignmentsCollection.FindOne(context.TODO(), filter).Decode(&existingAssignment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found in database"})
		return
	}

	// Retrieve submissions safely
	submissionsRaw, exists := existingAssignment["submissions"]
	if !exists {
		c.JSON(http.StatusOK, gin.H{"message": "Not Submitted"})
		return
	}

	submissions, ok := submissionsRaw.(primitive.A) // preferred over []interface{}
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid submissions format",
			"debug": fmt.Sprintf("%T", submissionsRaw), // Add debug type info
		})
		return
	}

	for _, s := range submissions {
		sub, ok := s.(primitive.M) // safer than bson.M here
		if !ok {
			continue
		}

		if sub["student"] == studentName {
			c.JSON(http.StatusOK, gin.H{
				"message":  "Submitted",
				"grade":    sub["grade"],
				"feedback": sub["feedback"],
			})
			return
		}
	}

	// No match
	c.JSON(http.StatusOK, gin.H{"message": "Not Submitted"})
}

func getSubmissions(c *gin.Context) {
	courseName := c.Param("course")
	assignmentName := c.Param("assignment")

	// ✅ Find assignment in MongoDB
	var assignment struct {
		Submissions []struct {
			Student  string `bson:"student"`
			FilePath string `bson:"filePath"`
			Grade    string `bson:"grade"`
			Feedback string `bson:"feedback"`
		} `bson:"submissions"`
	}

	filter := bson.M{"coursename": courseName, "assignmentname": assignmentName}
	err := assignmentsCollection.FindOne(context.TODO(), filter).Decode(&assignment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"submissions": assignment.Submissions})
}

func gradeAssignment(c *gin.Context) {
	studentName := c.Param("student")
	courseName := c.Param("course")
	assignmentName := c.Param("assignment")

	var gradeData struct {
		Grade    string `json:"grade"`
		Feedback string `json:"feedback"`
	}
	if err := c.ShouldBindJSON(&gradeData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// ✅ Update grade in MongoDB
	filter := bson.M{"coursename": courseName, "assignmentname": assignmentName, "submissions.student": studentName}
	update := bson.M{"$set": bson.M{
		"submissions.$.grade":    gradeData.Grade,
		"submissions.$.feedback": gradeData.Feedback,
	}}

	_, err := assignmentsCollection.UpdateOne(context.TODO(), filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update grade"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Grade submitted successfully"})
}

func getStudentAssignments(c *gin.Context) {
	courseName := strings.ToLower(c.Param("course")) // Ensure lowercase matching

	// Debug: Check course name and MongoDB documents
	log.Printf("Fetching assignments for course: %s\n", courseName)

	// Count assignments for the given course
	count, err := assignmentsCollection.CountDocuments(context.TODO(), bson.M{"coursename": bson.M{"$regex": courseName, "$options": "i"}})
	if err != nil {
		log.Println("Error counting documents:", err)
	} else {
		log.Printf("Found %d assignments for course: %s\n", count, courseName)
	}

	// Fetch assignments
	cursor, err := assignmentsCollection.Find(context.TODO(), bson.M{"coursename": bson.M{"$regex": courseName, "$options": "i"}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch assignments"})
		return
	}
	defer cursor.Close(context.TODO())

	var assignments []Assignment
	for cursor.Next(context.TODO()) {
		var assignment Assignment
		if err := cursor.Decode(&assignment); err != nil {
			log.Println("Error decoding assignment:", err)
			continue
		}

		// Debug: Print fetched assignment
		log.Printf("Fetched assignment: %+v\n", assignment)

		// Check if the assignment has a PDF file
		assignmentPath := filepath.Join("uploads", "courses", courseName, "assignments", assignment.AssignmentName, "assignment.pdf")
		if _, err := os.Stat(assignmentPath); err == nil {
			assignment.PDFPath = assignmentPath
		}

		assignments = append(assignments, assignment)
	}

	// Debug: Print final assignment list
	log.Printf("Returning assignments: %+v\n", assignments)

	// Return assignments list
	c.JSON(http.StatusOK, gin.H{"assignments": assignments})
}

// leaderboard
func AddPoint(c *gin.Context) {
	username := c.Param("username")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := leaderboardCollection.UpdateOne(ctx, bson.M{"username": username}, bson.M{"$inc": bson.M{"points": 10}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add points"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "10 points added"})
}

func DeletePoint(c *gin.Context) {
	username := c.Param("username")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := leaderboardCollection.UpdateOne(ctx, bson.M{"username": username}, bson.M{"$inc": bson.M{"points": -10}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete points"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "10 points deducted"})
}

func GetLeaderboard(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := leaderboardCollection.Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"points": -1}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve leaderboard"})
		return
	}

	var leaderboard []bson.M
	if err = cursor.All(ctx, &leaderboard); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse leaderboard data"})
		return
	}

	c.JSON(http.StatusOK, leaderboard)
}

func SearchStudent(c *gin.Context) {
	username := c.Param("username")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var student bson.M
	err := leaderboardCollection.FindOne(ctx, bson.M{"username": username}).Decode(&student)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found in leaderboard"})
		return
	}

	c.JSON(http.StatusOK, student)
}

func GetStudentLeaderboard(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Fetch leaderboard sorted by points in descending order
	cursor, err := leaderboardCollection.Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"points": -1}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve leaderboard"})
		return
	}

	var leaderboard []bson.M
	if err = cursor.All(ctx, &leaderboard); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse leaderboard data"})
		return
	}

	c.JSON(http.StatusOK, leaderboard)
}

//quizzz

// MongoDB collections

// Quiz model
type Quiz struct {
	ID        string     `json:"id" bson:"id"`
	Title     string     `json:"title" bson:"title"`
	Questions []Question `json:"questions" bson:"questions"`
	StartTime time.Time  `json:"startTime" bson:"startTime"`
	EndTime   time.Time  `json:"endTime" bson:"endTime"`
}

type Question struct {
	Question string   `json:"question"`
	Options  []string `json:"options"`
	Answer   string   `json:"answer"` // should be actual answer, not index
}

type QuizInput struct {
	Title     string     `json:"title"`
	Questions []Question `json:"questions"`
	StartTime string     `json:"startTime"`
	EndTime   string     `json:"endTime"`
}

type Submission struct {
	QuizID      string         `json:"quizId" bson:"quizId"`
	StudentID   string         `json:"studentId" bson:"studentId"`
	Studenname  string         `json:"studentname" bson:"studentname"`
	Answers     map[string]int `json:"answers" bson:"answers"`
	Score       int            `json:"score,omitempty" bson:"score"`
	SubmittedAt time.Time      `json:"submitted_at,omitempty" bson:"submitted_at,omitempty"`
}

func createQuiz(c *gin.Context) {
	var input QuizInput
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Parse start and end time from string to time.Time
	startTime, err1 := time.Parse(time.RFC3339, input.StartTime)
	endTime, err2 := time.Parse(time.RFC3339, input.EndTime)
	if err1 != nil || err2 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start or end time format"})
		return
	}

	quiz := Quiz{
		ID:        input.Title, // Set ID same as title
		Title:     input.Title,
		Questions: input.Questions,
		StartTime: startTime,
		EndTime:   endTime,
	}

	_, err := quizCollection.InsertOne(context.TODO(), quiz)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create quiz"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Quiz created successfully"})
}

func getAllquizSubmissions(c *gin.Context) {
	cursor, err := submissionCollection.Find(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get submissions"})
		return
	}

	var submissionDocs []struct {
		QuizID      string       `bson:"quizId"`
		Submissions []Submission `bson:"submissions"`
	}

	if err := cursor.All(context.TODO(), &submissionDocs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse submissions"})
		return
	}

	c.JSON(http.StatusOK, submissionDocs)
}

func getQuizSubmissionsByID(c *gin.Context) {
	quizID := c.Param("quizid")
	if quizID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "QuizID is required"})
		return
	}

	// Fetch the document for the specific quiz
	var submissionDoc struct {
		QuizID      string       `bson:"quizId"`
		Submissions []Submission `bson:"submissions"`
	}

	err := submissionCollection.FindOne(context.TODO(), bson.M{"quizId": quizID}).Decode(&submissionDoc)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No submissions found for this quiz"})
		return
	}

	// c.JSON(http.StatusOK, submissionDoc)
	c.JSON(http.StatusOK, gin.H{
		"quizId":      submissionDoc.QuizID,
		"submissions": submissionDoc.Submissions,
	})
}

func getStudentProgress(c *gin.Context) {
	email := c.Param("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}

	// Fetch all quizzes
	cursor, err := quizCollection.Find(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quizzes"})
		return
	}
	var quizzes []Quiz
	if err := cursor.All(context.TODO(), &quizzes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse quizzes"})
		return
	}

	// Prepare results
	var progress []gin.H

	for _, quiz := range quizzes {
		var submissionRecord struct {
			QuizID      string       `bson:"quizId"`
			Submissions []Submission `bson:"submissions"`
		}

		err := submissionCollection.FindOne(context.TODO(), bson.M{"quizId": quiz.ID}).Decode(&submissionRecord)
		if err != nil {
			// No submissions for this quiz at all
			progress = append(progress, gin.H{
				"quizId":      quiz.ID,
				"title":       quiz.Title,
				"status":      "missed",
				"score":       0,
				"submittedAt": nil,
			})
			continue
		}

		// Check if this student has submitted
		found := false
		for _, sub := range submissionRecord.Submissions {
			if sub.StudentID == email {
				progress = append(progress, gin.H{
					"quizId":      quiz.ID,
					"title":       quiz.Title,
					"status":      "submitted",
					"score":       sub.Score,
					"submittedAt": sub.SubmittedAt,
				})
				found = true
				break
			}
		}

		if !found {
			progress = append(progress, gin.H{
				"quizId":      quiz.ID,
				"title":       quiz.Title,
				"status":      "missed",
				"score":       0,
				"submittedAt": nil,
			})
		}
	}

	c.JSON(http.StatusOK, progress)
}

func getActiveQuizzes(c *gin.Context) {
	now := time.Now()
	log.Println("Current time:", now)

	filter := bson.M{
		"startTime": bson.M{"$lte": now},
		"endTime":   bson.M{"$gte": now},
	}

	cursor, err := quizCollection.Find(context.TODO(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get quizzes"})
		return
	}

	var quizzes []Quiz
	if err := cursor.All(context.TODO(), &quizzes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse quizzes"})
		return
	}

	c.JSON(http.StatusOK, quizzes)
}

func submitQuiz(c *gin.Context) {
	var submission Submission
	if err := c.BindJSON(&submission); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission format"})
		print("sdfsfdfsfdfsfsfdfsffd")
		return
	}

	var user struct {
		Email    string `bson:"email"`
		Username string `bson:"username"`
		Role     string `bson:"role"`
	}

	err := userCollection.FindOne(context.TODO(), bson.M{"email": submission.StudentID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// Optional: Ensure only students can submit (skip if not needed)
	if user.Role == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admins cannot submit quizzes"})
		return
	}

	// Add username as studentname in submission
	submission.Studenname = user.Username

	// Fetch quiz to calculate score
	var quiz Quiz
	err = quizCollection.FindOne(context.TODO(), bson.M{"id": submission.QuizID}).Decode(&quiz)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		print("sdfsfdfsfdfsfsfdfsasdadadadasdsadasdsssssssssffd")
		return
	}

	// Check if submission already exists in submissions collection
	var existingSubmissions struct {
		QuizID      string       `bson:"quizId"`
		Submissions []Submission `bson:"submissions"`
	}

	err = submissionCollection.FindOne(context.TODO(), bson.M{"quizId": submission.QuizID}).Decode(&existingSubmissions)
	if err == nil {
		for _, sub := range existingSubmissions.Submissions {
			if sub.StudentID == submission.StudentID {
				c.JSON(http.StatusBadRequest, gin.H{"error": "You have already submitted this quiz"})
				return
			}
		}
	}

	// Calculate score
	score := 0
	for idx, q := range quiz.Questions {
		key := fmt.Sprintf("q%d", idx)
		selectedOptionIndex := submission.Answers[key]
		if selectedOptionIndex >= 0 && selectedOptionIndex < len(q.Options) {
			selectedAnswer := q.Options[selectedOptionIndex]
			if selectedAnswer == q.Answer {
				score++
			}
		}
	}

	// Prepare submission with score and timestamp
	submission.Score = score
	submission.SubmittedAt = time.Now()

	// Push into submission collection grouped by quizId
	filter := bson.M{"quizId": submission.QuizID}
	update := bson.M{
		"$push": bson.M{
			"submissions": submission,
		},
	}
	opts := options.Update().SetUpsert(true)

	_, err = submissionCollection.UpdateOne(context.TODO(), filter, update, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save submission"})
		print("sdfsfdfsfdfsfsfdfsffd23232423")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Quiz submitted successfully",
		"score":   score,
	})
}

func getStudentResults(c *gin.Context) {
	email := c.Param("email")
	quizID := c.Param("quizid")

	if email == "" || quizID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and QuizID are required"})
		return
	}

	// Fetch only the submission document for the specific quiz
	var submissionDoc struct {
		quizId      string       `bson:"quizId"`
		Submissions []Submission `bson:"submissions"`
	}

	err := submissionCollection.FindOne(context.TODO(), bson.M{"quizId": quizID}).Decode(&submissionDoc)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz submissions not found"})
		return
	}

	// Find the submission for the specific student
	var targetSubmission *Submission
	for _, sub := range submissionDoc.Submissions {
		if sub.StudentID == email {
			targetSubmission = &sub
			break
		}
	}

	if targetSubmission == nil {
		c.JSON(http.StatusOK, gin.H{"message": "No submission found for this student", "submitted": false})
		return
	}

	// Fetch quiz details
	var quiz Quiz
	err = quizCollection.FindOne(context.TODO(), bson.M{"id": quizID}).Decode(&quiz)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load quiz data"})
		return
	}

	// Prepare result
	questionsWithAnswers := []gin.H{}
	for idx, q := range quiz.Questions {
		key := fmt.Sprintf("q%d", idx)
		userAnswerIdx, ok := targetSubmission.Answers[key]

		selectedOption := ""
		isCorrect := false

		if ok && userAnswerIdx >= 0 && userAnswerIdx < len(q.Options) {
			selectedOption = q.Options[userAnswerIdx]
			isCorrect = selectedOption == q.Answer
		}

		questionsWithAnswers = append(questionsWithAnswers, gin.H{
			"question":      q.Question,
			"userAnswer":    selectedOption,
			"correctAnswer": q.Answer,
			"isCorrect":     isCorrect,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"quizId":        quizID,
		"score":         targetSubmission.Score,
		"submittedtime": targetSubmission.SubmittedAt,
		"answers":       questionsWithAnswers,
		"submitted":     true,
	})
}

func hasSubmitted(c *gin.Context) {
	quizID := c.Param("quizID")
	studentID := c.Param("studentID")

	// Look for the quiz submission document
	var result struct {
		QuizID      string       `bson:"quizId"`
		Submissions []Submission `bson:"submissions"`
	}

	err := submissionCollection.FindOne(context.TODO(), bson.M{"quizId": quizID}).Decode(&result)
	if err != nil {
		// No submission found for this quiz at all
		c.JSON(http.StatusOK, gin.H{"submitted": false})
		return
	}

	for _, sub := range result.Submissions {
		if sub.StudentID == studentID {
			c.JSON(http.StatusOK, gin.H{"submitted": true})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"submitted": false})
}
func getusername1(c *gin.Context) {

	email := c.Param("email")
	if email == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"Username": "nil", "error": "Unauthorized: Invalid token data"})
		return
	}
	// Check if the user exists in the database
	var user User
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := userCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"Username": "nil", "error": "Unauthorized: User not found"})
		return
	}
	// Return success response
	c.JSON(http.StatusOK, gin.H{"username": user.Username})
}
func getQuizLeaderboard(c *gin.Context) {
	quizID := c.Param("quizid")
	if quizID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "QuizID is required"})
		return
	}

	// Fetch submission document for this quiz
	var submissionDoc struct {
		QuizID      string       `bson:"quizId"`
		Submissions []Submission `bson:"submissions"`
	}

	err := submissionCollection.FindOne(context.TODO(), bson.M{"quizId": quizID}).Decode(&submissionDoc)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No submissions found for this quiz"})
		return
	}

	// Sort submissions by score in descending order
	sort.Slice(submissionDoc.Submissions, func(i, j int) bool {
		return submissionDoc.Submissions[i].Score > submissionDoc.Submissions[j].Score
	})

	// Build leaderboard with usernames
	leaderboard := []gin.H{}
	for idx, sub := range submissionDoc.Submissions {
		// Fetch the username for this email
		var user struct {
			Username string `bson:"username"`
		}
		err := userCollection.FindOne(context.TODO(), bson.M{"email": sub.StudentID}).Decode(&user)
		username := sub.StudentID // fallback
		if err == nil {
			username = user.Username
		}

		leaderboard = append(leaderboard, gin.H{
			"rank":        idx + 1,
			"username":    username,
			"email":       sub.StudentID,
			"score":       sub.Score,
			"submittedAt": sub.SubmittedAt,
		})
	}

	c.JSON(http.StatusOK, leaderboard)
}

func getAllQuizzes(c *gin.Context) {
	cursor, err := quizCollection.Find(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quizzes"})
		return
	}

	// var quizzes []Quiz
	quizzes := []Quiz{}
	if err := cursor.All(context.TODO(), &quizzes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse quizzes"})
		return
	}

	c.JSON(http.StatusOK, quizzes)

}

func main() {
	router := gin.Default()
	// router.Use(func(c *gin.Context) {
	// 	c.Writer.Header().Set("Access-Control-Allow-Origin", "http://127.0.0.1:5500")
	// 	c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
	// 	c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	// 	c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")

	// 	if c.Request.Method == "OPTIONS" {
	// 		c.AbortWithStatus(http.StatusNoContent)
	// 		return
	// 	}

	// 	c.Next()
	// })
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"}, // Allow frontend origin
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))
	// Routes
	router.StaticFS("/uploads", http.Dir("uploads"))
	router.POST("/register", Register)
	router.POST("/login", Login)
	protected := router.Group("/")
	protected.Use(AuthMiddleware())
	protected.GET("/status", CheckLoginStatus)
	router.POST("/request-otp1", RequestOTP1)
	router.POST("/verify-otp1", VerifyOTP1)
	router.POST("/add-details", AddUserDetails)
	router.POST("/check-role", CheckUserRole)
	router.PUT("/verify-payment/:email", VerifyPayment)
	router.POST("/updateuser/:email", UpdateUserDetails)
	router.GET("/students", GetAllStudents)
	router.GET("/userdetails/:email", GetUserDetails)
	router.POST("/logout", Logout)
	router.GET("/userm", userm)
	router.GET("/username", getusername)
	router.GET("/username/email/:email", getusername1)

	admin := router.Group("/admin")
	admin.POST("/course", createCourse)
	admin.POST("/course/:course/resource", uploadResource)
	// admin.POST("/courses/:course/uploadTextNote", uploadTextNote)
	admin.POST("/courses/:course/uploadTextNote", uploadTextNote)
	admin.POST("/courses/:course/assignments", createAssignment)
	admin.GET("/courses/:course/assignments/:assignment/submissions", getSubmissions)
	admin.POST("/courses/:course/assignments/:assignment/students/:student/grade", gradeAssignment)

	admin.POST("/leaderboard/addpoint/:username", AddPoint)
	admin.POST("/leaderboard/deletepoint/:username", DeletePoint)
	admin.GET("/leaderboard", GetLeaderboard)
	admin.GET("/leaderboard/search/:username", SearchStudent)

	admin.POST("/create-quiz", createQuiz)
	admin.GET("/submissions", getAllquizSubmissions)
	admin.GET("/student-progress/email/:email", getStudentProgress)
	router.GET("/leaderboard/:quizid", getQuizLeaderboard)
	admin.GET("/submissions/quiz/:quizid", getQuizSubmissionsByID)
	admin.GET("/quizzes", getAllQuizzes)

	// Student routes
	router.GET("/courses", getCourses)
	router.GET("/course/:course/resources", getCourseResources)
	router.GET("/course/:course/resource/:resource", downloadResource)
	// router.GET("/courses/:course/downloadNotes", downloadNotes)
	router.GET("/courses/:course/downloadNotes/:note", downloadNotes)
	router.POST("/students/:student/courses/:course/assignments/:assignment/upload", uploadAssignment)
	router.POST("/students/:student/courses/:course/assignments/:assignment/checksubmission", checkAssignmentSubmission)
	router.GET("/students/courses/:course/assignments", getStudentAssignments) // **View Assignments**
	router.GET("/leaderboard", GetStudentLeaderboard)

	router.GET("/active-quizzes", getActiveQuizzes)
	router.POST("/submit-quiz", submitQuiz)
	router.GET("/results/email/:email/quizid/:quizid", getStudentResults)
	router.GET("/checkquizSubmission/:quizID/:studentID", hasSubmitted)

	fmt.Println("Server running on port 8000")
	router.Run(":8000")

}
