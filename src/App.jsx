import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import PersonalizedRecommendationsPage from "./PersonalizedRecommendationsPage";
import LocalDirectory from "./components/LocalDirectory";

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

        <Route path="/directory" element={<LocalDirectory />} />
      </Routes>
    </BrowserRouter>
  );
}
