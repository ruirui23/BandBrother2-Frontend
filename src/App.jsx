import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import SelectDifficulty from './pages/SelectDifficulty.jsx';
import Play from './pages/Play.jsx';
import Result from "./pages/Result.jsx";
import TwoPlayerSelect from './pages/TwoPlayerSelect.jsx';
import TwoPlayerPlay from './pages/TwoPlayerPlay.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/select/:musicId" element={<SelectDifficulty />} />
        <Route path="/play/:musicId/:difficulty" element={<Play />}   key={Date.now()} />
        <Route path="/result" element={<Result />} />
        <Route path="/two-player-select" element={<TwoPlayerSelect />} />
        <Route path="/play2/:musicId/:p1/:p2" element={<TwoPlayerPlay />} />
      </Routes>
    </BrowserRouter>
  );
}
