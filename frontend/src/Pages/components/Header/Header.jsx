import { Link, useNavigate } from "react-router-dom";
import "./Header.css";
import { useContext, useState, useEffect } from "react";  // Added useEffect
import MyContext from "../Layout/MyContext";
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import { MdMenuOpen } from "react-icons/md";
import { FaUserCircle } from "react-icons/fa";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Logout from '@mui/icons-material/Logout';
import { MdOutlineMenu } from "react-icons/md";
import axios from "axios";
import { useAuth } from "../Layout/AuthContext";

const Header = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const { isToggleSidebar, setIsToggleSidebar } = useContext(MyContext);
  const navigate = useNavigate();
  const { profilePhotoUrl, updateTimestamp } = useAuth();  // Also get updateTimestamp

  // Force component re-render when photo URL changes
  const [photoKey, setPhotoKey] = useState(Date.now());
  
  useEffect(() => {
    // Update photoKey when profilePhotoUrl or updateTimestamp changes
    setPhotoKey(updateTimestamp || Date.now());
  }, [profilePhotoUrl, updateTimestamp]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  
  function handleLogout() {
    const token = localStorage.getItem("token");

    axios.post(
      "http://localhost:8000/logout",
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("email");
        navigate("/login");
      })
      .catch((error) => {
        console.error("Logout error:", error);
        alert("Failed to logout. Try again.");
      });
  }

  return (
    <header className="header-container d-flex align-items-center">
      <div className="container-fluid w-100">
        <div className="d-flex align-items-center px-3">

          {/* Logo */}
          <div className="col-sm-3 part1">
            <Link to="/dashboard" className="d-flex align-items-center logo">
              <img src="/acm.png" alt="Logo" />
            </Link>
          </div>
          <div className="toggle col-xs-3 d-flex align-items-center part2 pl-4">
            <Button
              className="rounded-circle mr-3"
              onClick={() => {
                setIsToggleSidebar(!isToggleSidebar);
              }}
            >
              {
                isToggleSidebar === false ? <MdMenuOpen size={24} /> : <MdOutlineMenu size={24} />
              }
            </Button>

          </div>
          <div className="col-sm-7 d-flex align-items-center justify-content-end part3">
            <div className="myAccWrapper">
              <div className="col-xs-3 d-flex align-items-center part2 pl-4">
                <div className="myAcc d-flex align-items-center">
                  <div className="userImg">
                    <Button
                      className="rounded-circle"
                      onClick={handleClick}
                      aria-controls={open ? 'account-menu' : undefined}
                      aria-haspopup="true"
                      aria-expanded={open ? 'true' : undefined}
                    >
                      {profilePhotoUrl ? (
                        <Avatar 
                          src={profilePhotoUrl}
                          alt="Profile"
                          sx={{ width: 44, height: 44 }}
                          key={photoKey} // Add key to force re-render
                        />
                      ) : (
                        <FaUserCircle size={24} />
                      )}
                    </Button>
                    <Menu
                      anchorEl={anchorEl}
                      id="account-menu"
                      open={open}
                      onClose={handleClose}
                      onClick={handleClose}
                      slotProps={{
                        paper: {
                          elevation: 0,
                          sx: {
                            overflow: 'visible',
                            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                            mt: 1.5,
                            '& .MuiAvatar-root': {
                              width: 32,
                              height: 32,
                              ml: -0.5,
                              mr: 1,
                            },
                            '&::before': {
                              content: '""',
                              display: 'block',
                              position: 'absolute',
                              top: 0,
                              right: 'calc(50% - 5px)', // Center the arrow
                              width: 10,
                              height: 10,
                              bgcolor: 'background.paper',
                              transform: 'translateY(-50%) rotate(45deg)',
                              zIndex: 0,
                            },
                          },
                        },
                      }}
                      transformOrigin={{ horizontal: 'center', vertical: 'top' }}
                      anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
                    >
                      <MenuItem onClick={() => { handleClose(); navigate("/userprofile"); }}>
                      {profilePhotoUrl ? (
                          <Avatar 
                            src={profilePhotoUrl} 
                            key={photoKey} // Add key here too
                          />
                        ) : (
                          <Avatar />
                        )} My account
                      </MenuItem>
                      <Divider />
                      <MenuItem
                        onClick={() => {
                          handleLogout();  // logout logic
                          handleClose();   // close the menu
                        }}
                      >
                        <ListItemIcon>
                          <Logout fontSize="small" />
                        </ListItemIcon>
                        Logout
                      </MenuItem>
                    </Menu>
                  </div>
                  <div className="userInfo">
                    <h4>
                      {/* User info content here */}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;