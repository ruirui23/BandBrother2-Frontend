import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { WiiboardProvider } from "./context/WiiboardContext";
import Home from './pages/Home.jsx'
import TutorialMenu from './pages/TutorialMenu.jsx'
import SelectDifficulty from './pages/SelectDifficulty.jsx'
import SelectDifficultyMulti from './pages/SelectDifficultyMulti.jsx'
import Play from './pages/Play.jsx'
import Result from './pages/Result.jsx'
import TwoPlayerSelect from './pages/TwoPlayerSelect.jsx'
import TwoPlayerPlay from './pages/TwoPlayerPlay.jsx'
import TwoPlayerPlayCustom from './pages/TwoPlayerPlayCustom.jsx'
import ChartEditor from './pages/ChartEditor.jsx'
import PlayCustom from './pages/PlayCustom.jsx'
import CustomCharts from './pages/CustomCharts.jsx'
import MatchRoom from './pages/MatchRoom.jsx'
import MultiPlay from './pages/MultiPlay.jsx'
import MultiMusicSelect from './pages/MultiMusicSelect.jsx'
import { auth } from './firebase'
import { useEffect, useState } from 'react'
import WiiboardMonitor from "./components/WiiboardMonitor";

function RequireAuth({ children }) {
  const [user, setUser] = useState(auth.currentUser)
  const location = useLocation()
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u))
    return () => unsub()
  }, [])
  if (user === undefined) return null
  if (!user) return <Navigate to="/" state={{ from: location }} replace />
  return children
}

export default function App() {
  return (
    <WiiboardProvider>
    <BrowserRouter>
      <WiiboardMonitor />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tutorial" element={<TutorialMenu />} />
        <Route
          path="/select"
          element={
            <RequireAuth>
              <SelectDifficulty />
            </RequireAuth>
          }
        />
        <Route
          path="/select/:musicId"
          element={
            <RequireAuth>
              <SelectDifficulty />
            </RequireAuth>
          }
        />
        <Route
          path="/select-difficulty/:roomId"
          element={<SelectDifficultyMulti />}
        />
        <Route
          path="/play/:musicId/:difficulty"
          element={
            <RequireAuth>
              <Play />
            </RequireAuth>
          }
        />
        <Route path="/multi-play/:roomId/:difficulty" element={<MultiPlay />} />
        <Route path="/result" element={<Result />} />
        <Route
          path="/multi-music-select"
          element={
            <RequireAuth>
              <MultiMusicSelect />
            </RequireAuth>
          }
        />
        <Route
          path="/match"
          element={
            <RequireAuth>
              <MatchRoom />
            </RequireAuth>
          }
        />
        <Route
          path="/two-player-select"
          element={
            <RequireAuth>
              <TwoPlayerSelect />
            </RequireAuth>
          }
        />
        <Route
          path="/play2/:musicId/:p1/:p2"
          element={
            <RequireAuth>
              <TwoPlayerPlay />
            </RequireAuth>
          }
        />
        <Route
          path="/chart-editor"
          element={
            <RequireAuth>
              <ChartEditor />
            </RequireAuth>
          }
        />
        <Route
          path="/custom-charts"
          element={
            <RequireAuth>
              <CustomCharts />
            </RequireAuth>
          }
        />
        <Route
          path="/play/custom/:chartId"
          element={
            <RequireAuth>
              <PlayCustom />
            </RequireAuth>
          }
        />
        <Route
          path="/twoplayer/play/custom/:chartId"
          element={
            <RequireAuth>
              <TwoPlayerPlayCustom />
            </RequireAuth>
          }
        />
        <Route
          path="/twoplayer/play/tutorial/:difficulty"
          element={
            <RequireAuth>
              <TwoPlayerPlay />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
    </WiiboardProvider>
  )
}
