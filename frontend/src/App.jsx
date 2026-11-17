import { Routes, Route } from "react-router";
import HomePage from "./pages/Homepage";
import Navbar from "./components/navbar";

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <><Navbar /><HomePage /></>} />
      
    </Routes>
  );
}

export default App;