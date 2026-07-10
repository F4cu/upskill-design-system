import { createBrowserRouter } from 'react-router-dom'
import Homepage from './pages/Homepage'
import CourseOverview from './pages/CourseOverview'
import UserSettings from './pages/UserSettings'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'

export const router = createBrowserRouter(
  [
    { path: '/', element: <Homepage /> },
    { path: '/showcase/homepage', element: <Homepage /> },
    { path: '/showcase/course', element: <CourseOverview /> },
    { path: '/showcase/settings', element: <UserSettings /> },
    { path: '/dashboard', element: <Dashboard /> },
    { path: '/pipeline', element: <Pipeline /> },
  ],
  { basename: import.meta.env.BASE_URL },
)
