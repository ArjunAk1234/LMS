import './Sidebar.css';
import Button from '@mui/material/Button';
import { IoMdHome } from "react-icons/io";
import { MdAssignment } from "react-icons/md";
import { FaTrophy, FaBook } from "react-icons/fa";
import MyContext from "../Layout/MyContext";
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
const Sidebar = () => {
    const { isToggleSidebar } = useContext(MyContext);
    const navigate = useNavigate();
    const location=useLocation();
    const isActive=(path)=> location.pathname===path;
    return (
        <div className={`sidebar ${isToggleSidebar ? 'collapsed' : ''}`}>
            <ul>
                <li className={isActive('/dashboard') ? 'active' : ''}>
                    <Button 
                        fullWidth 
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => navigate('/dashboard')}
                    >
                        <span className='icon'><IoMdHome /></span>
                        Home
                    </Button>
                </li>
                <li className={isActive('/course') ? 'active' : ''}>
                    <Button 
                        fullWidth 
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => navigate('/course')}
                    >
                        <span className='icon'><FaBook /></span>
                        Course
                    </Button>
                </li>
                <li className={isActive('/assignment') ? 'active' : ''}>
                    <Button 
                        fullWidth 
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => navigate('/assignment')}
                    >
                        <span className='icon'><MdAssignment /></span>
                        Assignments
                    </Button>
                </li>
                <li className={isActive('/leaderboard') ? 'active' : ''}>
                    <Button 
                        fullWidth 
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => navigate('/leaderboard')}
                    >
                        <span className='icon'><FaTrophy /></span>
                        Leaderboard
                    </Button>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
