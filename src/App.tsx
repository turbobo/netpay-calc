import { useState, useEffect } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const route = useHashRoute()

  switch (route.path) {
    case '/login':
      return <LoginPage />
    case '/dashboard':
      return <DashboardPage />
    default:
      return <HomePage />
  }
}
