import './Sidebar.css';
import Button from '@mui/material/Button';
import { IoMdHome } from "react-icons/io";
import { MdAssignment } from "react-icons/md";
import { FaTrophy, FaBook } from "react-icons/fa";
import { TfiWrite } from "react-icons/tfi";
import MyContext from "../Layout/MyContext";
import { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Layout/AuthContext';

const Sidebar = () => {
    const { isToggleSidebar } = useContext(MyContext);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const isQuizActive = () =>
        location.pathname === '/quiz'; // Checking the single /quiz route

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
                        Courses
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
                <li className={isQuizActive() ? 'active' : ''}>
                    <Button
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => navigate('/quiz')}
                    >
                        <span className='icon'><TfiWrite /></span>
                        {user?.role === 'admin' ? 'Admin Quiz' : 'Quiz'}
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
