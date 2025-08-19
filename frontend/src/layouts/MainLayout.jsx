import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Badge,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
  PlayArrow as PlayArrowIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  SignalWifi4Bar as SignalWifiIcon,
  SignalWifiOff as SignalWifiOffIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import Logo from '../components/Logo';

const drawerWidth = 240;

const MainLayout = ({ darkMode, toggleDarkMode, socketConnected }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Navigation items
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { name: 'Requirements', path: '/requirements', icon: <DescriptionIcon /> },
    { name: 'Script Generator', path: '/generator', icon: <CodeIcon /> },
    { name: 'Testing', path: '/testing', icon: <PlayArrowIcon /> },
    { name: 'Results', path: '/results', icon: <AssessmentIcon /> },
    { name: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  ];

  // Toggle drawer
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Navigate to page
  const navigateTo = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: 'center' }}>
        <Logo height={40} />
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigateTo(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <Tooltip title="View on GitHub">
          <IconButton
            color="inherit"
            onClick={() => window.open('https://github.com/Starman69420/AutoTool', '_blank')}
          >
            <GitHubIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            AutoTool
          </Typography>
          <Tooltip title={socketConnected ? 'Connected to server' : 'Disconnected'}>
            <Badge
              color={socketConnected ? 'success' : 'error'}
              variant="dot"
              sx={{ mr: 2 }}
            >
              {socketConnected ? <SignalWifiIcon /> : <SignalWifiOffIcon />}
            </Badge>
          </Tooltip>
          <Tooltip title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton color="inherit" onClick={toggleDarkMode}>
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;