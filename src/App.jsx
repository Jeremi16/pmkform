import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

import SuccessPage from './components/SuccessPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-brown-50 font-sans text-gray-800">
        <div className="py-8 px-4">
          <Routes>
            <Route path="/" element={<RegistrationForm />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/masukeuy" element={<Login />} />
            <Route
              path="/atminnihbos"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
