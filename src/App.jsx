import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import SelectDifficulty from './pages/SelectDifficulty.jsx';
import Play from './pages/Play.jsx';
import Result from "./pages/Result.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/select/:musicId" element={<SelectDifficulty />} />
        <Route path="/play/:musicId/:difficulty" element={<Play />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  );
}
