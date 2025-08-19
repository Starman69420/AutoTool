import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { io } from 'socket.io-client';

// Components
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Requirements from './pages/Requirements';
import ScriptGenerator from './pages/ScriptGenerator';
import ScriptTesting from './pages/ScriptTesting';
import TestResults from './pages/TestResults';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Create socket.io connection
const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001');

const App = () => {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [socketConnected, setSocketConnected] = useState(false);

  // Create theme
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  // Setup socket connection
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket connected');
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              socketConnected={socketConnected}
            />
          }
        >
          <Route index element={<Dashboard socket={socket} />} />
          <Route path="requirements" element={<Requirements />} />
          <Route path="generator" element={<ScriptGenerator socket={socket} />} />
          <Route path="testing" element={<ScriptTesting socket={socket} />} />
          <Route path="results" element={<TestResults socket={socket} />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
};

export default App;