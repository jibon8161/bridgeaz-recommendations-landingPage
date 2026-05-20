import { BrowserRouter, Routes, Route } from "react-router-dom";
import PersonalizedRecommendationsPage from "./PersonalizedRecommendationsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/recommendations/:token"
          element={<PersonalizedRecommendationsPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}
