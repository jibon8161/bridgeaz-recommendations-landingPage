import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import PersonalizedRecommendationsPage from "./PersonalizedRecommendationsPage";
import LocalDirectory from "./components/LocalDirectory";
import LoginPage from "./LoginPage";
import MyBridgeHome from "./MyBridgeHome";
import ProtectedRoute from "./ProtectedRoute";
export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        containerStyle={{
          zIndex: 999999,
        }}
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "16px",
            fontWeight: "700",
          },
        }}
      />

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MyBridgeHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommendations/:token"
          element={<PersonalizedRecommendationsPage />}
        />

        <Route path="/directory" element={<LocalDirectory />} />
      </Routes>
    </BrowserRouter>
  );
}
