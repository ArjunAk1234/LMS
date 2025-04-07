import './Sidebar.css';
import Button from '@mui/material/Button';
import { MdOutlineDashboard } from "react-icons/md";
import { MdAssignment } from "react-icons/md";
import MyContext from "../Layout/MyContext";
import { useContext } from 'react';
const Sidebar = () => {
    const { isToggleSidebar } = useContext(MyContext);
    return (
        <div className='sidebar'>
            <ul>
                <li>
                    <Button fullWidth sx={{ justifyContent: 'flex-start' }}>
                        <span className='icon'><MdOutlineDashboard /></span>
                        Home
                        <span className='arrow'></span>
                    </Button>
                    
                </li>
                <li>
                    <Button fullWidth sx={{ justifyContent: 'flex-start' }}>
                        <span className='icon'><MdAssignment />
                        </span>
                        Assignments
                        <span className='arrow'></span>
                    </Button>
                </li>
            </ul>
        </div>
    )
}
export default Sidebar;