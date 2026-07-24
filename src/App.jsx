import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import PersonalizedRecommendationsPage from "./PersonalizedRecommendationsPage";

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
        <Route
          path="/recommendations/:token"
          element={<PersonalizedRecommendationsPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}
