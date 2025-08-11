import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const GRID_WIDTH_BASE = 1200; // 横長に拡大
const NOTE_RADIUS = 18;

const LOCAL_SONGS = [
  { title: "Henceforth", url: "/audio/Henceforth.mp3" },
  { title: "DAYBREAK FRONTLINE", url: "/audio/DAYBREAK FRONTLINE.mp3" },
  { title: "NOMONEYDANCE", url: "/audio/NOMONEYDANCE.mp3" },
  { title: "あつまれ！パーティーピーポー", url: "/audio/あつまれ！パーティーピーポー.mp3" },
  { title: "喜志駅周辺なんもない", url: "/audio/喜志駅周辺なんもない.mp3" },
  { title: "無線LANマジ便利", url: "/audio/無線LANマジ便利.mp3" },
];

const LANE_COLORS = [
  { bg: 'bg-orange-900/50', border: 'border-orange-400', note: 'bg-orange-300', noteBorder: 'border-orange-500' },
  { bg: 'bg-pink-900/50', border: 'border-pink-400', note: 'bg-pink-300', noteBorder: 'border-pink-500' },
  { bg: 'bg-cyan-900/50', border: 'border-cyan-400', note: 'bg-cyan-300', noteBorder: 'border-cyan-500' },
  { bg: 'bg-green-900/50', border: 'border-green-400', note: 'bg-green-300', noteBorder: 'border-green-500' },
];

const EditorLane = React.memo(React.forwardRef(
  ({ lane, notes, onNotesChange, duration, gridWidth, beatCount, gridStep, colorConfig }, ref) => {
    const getX = (time) => (time / duration) * gridWidth;

    const handleGridClick = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = duration * (x / gridWidth);

      const proximityThreshold = duration * (NOTE_RADIUS * 2 / gridWidth);
      const foundIndex = notes.findIndex(n => n.lane === lane && Math.abs(n.time - time) < proximityThreshold);

      if (foundIndex !== -1) {
        onNotesChange(notes.filter((_, i) => i !== foundIndex));
      } else {
        onNotesChange([...notes, { time, lane, type: 'tap' }].sort((a,b) => a.time - b.time));
      }
    };
    
    return (
      <div 
        ref={ref} 
        className={`w-full h-24 ${colorConfig.bg} rounded-xl border-2 ${colorConfig.border} shadow-inner flex items-center relative overflow-x-auto`}
        style={{ minWidth: 800, maxWidth: 1400 }}
      >
        <div
          className="absolute inset-0 cursor-pointer"
          style={{ width: gridWidth, height: '100%' }}
          onClick={handleGridClick}
        >
          {Array.from({ length: beatCount + 1 }).map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: i * gridStep }} />
          ))}
          {notes.filter(n => n.lane === lane).map((n, i) => (
            <div
              key={i}
              className={`absolute rounded-full ${colorConfig.note} ${colorConfig.noteBorder} border-2 shadow-lg`}
              style={{
                left: getX(n.time) - NOTE_RADIUS,
                top: '50%', transform: 'translateY(-50%)',
                width: NOTE_RADIUS * 2, height: NOTE_RADIUS * 2, zIndex: 20
              }}
            />
          ))}
        </div>
      </div>
    );
  }
));

export default function ChartEditor() {
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(120);
  const [duration, setDuration] = useState(15);
  const [notes, setNotes] = useState([]);
  const [selectedSong, setSelectedSong] = useState(LOCAL_SONGS[0].url);
  const [audioError, setAudioError] = useState(false);
  const [customAudioFile, setCustomAudioFile] = useState(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [editingChartId, setEditingChartId] = useState(null);
  const [userCharts, setUserCharts] = useState([]);
  const [allCharts, setAllCharts] = useState([]);
  const [isChartListVisible, setIsChartListVisible] = useState(false);
  const [showAllCharts, setShowAllCharts] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const laneRefs = useRef([]);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  const beatCount = Math.floor((bpm / 60) * duration);
  const GRID_WIDTH = Math.max(GRID_WIDTH_BASE, beatCount * 40);
  const gridStep = GRID_WIDTH / beatCount;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchCharts = useCallback(async () => {
    try {
      const allChartsQuery = query(collection(db, 'charts'));
      const allChartsSnapshot = await getDocs(allChartsQuery);
      setAllCharts(allChartsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      if (currentUser) {
        const userChartsQuery = query(collection(db, 'charts'), where('createdBy', '==', currentUser.uid));
        const userChartsSnapshot = await getDocs(userChartsQuery);
        setUserCharts(userChartsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setUserCharts([]);
      }
    } catch (error) {
      console.error('譜面の取得に失敗しました:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  const loadChart = (chart) => {
    setTitle(chart.title);
    setBpm(chart.bpm);
    setDuration(chart.duration || 15);
    setNotes(chart.notes || []);
    const songUrl = chart.audio || LOCAL_SONGS[0].url;
    setSelectedSong(songUrl);
    if(chart.audioType === 'uploaded') {
      setUploadedAudioUrl(songUrl);
    }
    setEditingChartId(chart.id);
    setIsChartListVisible(false);
    setCurrentTime(0);
  };
  
  const handleNewChart = () => {
    setTitle('');
    setBpm(120);
    setNotes([]);
    setSelectedSong(LOCAL_SONGS[0].url);
    setEditingChartId(null);
    setCustomAudioFile(null);
    setUploadedAudioUrl('');
    if (audioRef.current) {
        const defaultDuration = 30; // 仮のデフォルト値
        setDuration(defaultDuration);
    }
  };

  const handleSyncDuration = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    } else {
      alert("音源が読み込めていません。");
    }
  };

  const deleteChart = async (chartIdToDelete) => {
    if(!window.confirm("本当にこの譜面を削除しますか？この操作は元に戻せません。")) return;
    try {
      await deleteDoc(doc(db, 'charts', chartIdToDelete));
      alert('譜面を削除しました。');
      fetchCharts(); // 譜面リストを更新
    } catch (error) {
      console.error('譜面の削除に失敗:', error);
      alert('譜面の削除に失敗しました。');
    }
  };
  
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      setAudioError(false);
    }
  }, [selectedSong]);

  const handleAudioUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { alert('音声ファイルを選択してください'); return; }
    if (file.size > 50 * 1024 * 1024) { alert('ファイルサイズが大きすぎます。50MB以下のファイルを選択してください。'); return; }
    if (!currentUser) { alert('アップロードにはログインが必要です。'); return; }

    setIsUploading(true);
    setUploadProgress(0);
    setCustomAudioFile(file);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `music/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setUploadedAudioUrl(downloadURL);
      setSelectedSong(downloadURL);
      alert('音声ファイルのアップロードが完了しました！');
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert(`アップロードに失敗しました: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleAudioError = () => { setAudioError(true); console.error('音声ファイルの読み込みに失敗:', selectedSong); };

  const updateScrollPosition = useCallback((time) => {
    if (laneRefs.current.length > 0 && laneRefs.current[0]) {
      const firstLane = laneRefs.current[0];
      if (!firstLane) return;
      const visibleWidth = firstLane.clientWidth;
      const targetScrollLeft = (time / duration) * GRID_WIDTH - (visibleWidth / 2);
      laneRefs.current.forEach(lane => {
        if (lane) lane.scrollLeft = targetScrollLeft;
      });
    }
  }, [duration, GRID_WIDTH]);

  const saveChart = async () => {
    if (!title) { alert('タイトルは必須です'); return; }
    if (notes.length === 0 && !confirm('ノーツがありませんが保存しますか？')) return;

    const chartData = {
      title,
      audio: selectedSong,
      audioType: uploadedAudioUrl === selectedSong ? 'uploaded' : 'local',
      audioTitle: customAudioFile?.name || LOCAL_SONGS.find(s => s.url === selectedSong)?.title || '音源',
      bpm: Number(bpm),
      duration: Number(duration),
      notes: notes,
      createdBy: currentUser?.uid || 'unknown',
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingChartId) {
        await updateDoc(doc(db, 'charts', editingChartId), chartData);
        alert('譜面を更新しました！');
      } else {
        const docRef = await addDoc(collection(db, 'charts'), { ...chartData, createdAt: serverTimestamp() });
        setEditingChartId(docRef.id);
        alert('譜面を保存しました！');
      }
      fetchCharts();
    } catch (e) {
      console.error('保存に失敗しました:', e);
      alert('保存に失敗しました。');
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current && !audioError) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => setAudioError(true));
      } else {
        audioRef.current.pause();
      }
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      updateScrollPosition(time);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      updateScrollPosition(audioRef.current.currentTime);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const updatePlayingStatus = () => setIsPlaying(!audio.paused);
      audio.addEventListener('play', updatePlayingStatus);
      audio.addEventListener('pause', updatePlayingStatus);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      return () => {
        audio.removeEventListener('play', updatePlayingStatus);
        audio.removeEventListener('pause', updatePlayingStatus);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [selectedSong, updateScrollPosition]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 text-white p-4">
      <button onClick={() => navigate(-1)} className="absolute left-4 top-4 px-4 py-2 bg-gray-600 text-white rounded z-30">戻る</button>
      <h2 className="text-4xl font-bold my-6 drop-shadow">譜面作成</h2>
      
      {isChartListVisible ? (
        <div className="bg-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl">譜面一覧</h3>
            <div className="flex gap-2">
              <button onClick={() => setShowAllCharts(false)} className={`px-3 py-1 rounded text-sm ${!showAllCharts ? 'bg-blue-500' : 'bg-gray-600'}`}>自分の譜面</button>
              <button onClick={() => setShowAllCharts(true)} className={`px-3 py-1 rounded text-sm ${showAllCharts ? 'bg-blue-500' : 'bg-gray-600'}`}>全ての譜面</button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {(showAllCharts ? allCharts : userCharts).map(chart => (
              <div key={chart.id} className="bg-gray-800/50 hover:bg-gray-700/50 rounded p-3 flex justify-between items-center">
                <button onClick={() => loadChart(chart)} className="text-left flex-grow">
                  <div className="font-medium">{chart.title}</div>
                  <div className="text-sm text-gray-400">BPM: {chart.bpm} | 長さ: {Math.round(chart.duration)}秒 | 音源: {chart.audioTitle}</div>
                </button>
                {chart.createdBy === currentUser?.uid && (
                   <button onClick={() => deleteChart(chart.id)} className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">削除</button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={fetchCharts} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded">更新</button>
            <button onClick={() => setIsChartListVisible(false)} className="px-4 py-2 bg-gray-600 rounded">閉じる</button>
          </div>
        </div>
      ) : (
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
        {/* Left Panel */}
        <div className="bg-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 lg:w-1/3">
            <div className="flex gap-2">
              <button onClick={handleNewChart} className="flex-1 px-4 py-2 bg-blue-500 rounded">新規作成</button>
              <button onClick={() => setIsChartListVisible(true)} className="flex-1 px-4 py-2 bg-purple-500 rounded">譜面一覧</button>
            </div>
            <div>
              <label className="text-sm">譜面タイトル</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 mt-1 rounded bg-gray-700 focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="text-sm">BPM</label>
                <input type="number" value={bpm} onChange={e => setBpm(Number(e.target.value))} className="w-full p-2 mt-1 rounded bg-gray-700" />
              </div>
              <div>
                <label className="text-sm">長さ(秒)</label>
                <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full p-2 mt-1 rounded bg-gray-700" />
              </div>
            </div>
            
            <div>
              <label className="text-sm">BGM</label>
              <select value={selectedSong} onChange={e => setSelectedSong(e.target.value)} className="w-full p-2 mt-1 rounded bg-gray-700">
                {LOCAL_SONGS.map(s => <option key={s.url} value={s.url}>{s.title}</option>)}
                {uploadedAudioUrl && <option value={uploadedAudioUrl}>アップロードした音源</option>}
              </select>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-sm">カスタムBGM</label>
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-600 hover:file:bg-blue-700" disabled={isUploading} />
                {isUploading && <div className="text-sm text-yellow-400">アップロード中...</div>}
            </div>

            <button onClick={handleSyncDuration} className="px-4 py-2 bg-indigo-500 rounded">音源の長さに同期</button>
            
            <audio ref={audioRef} src={selectedSong} onError={handleAudioError} onLoadedMetadata={handleSyncDuration} />
            {audioError && <p className="text-sm text-red-500">音源読み込みエラー</p>}
            
            <div className="flex items-center gap-2">
                <button onClick={handlePlayPause} className="px-4 py-2 bg-green-600 rounded">{isPlaying ? '停止' : '再生'}</button>
                <input type="range" min="0" max={duration} value={currentTime} onChange={handleSeek} className="w-full" />
                <span className="text-sm w-24 text-right">{currentTime.toFixed(2)}s / {duration.toFixed(2)}s</span>
            </div>

            <button onClick={saveChart} className="w-full px-4 py-3 bg-yellow-500 hover:bg-yellow-600 rounded text-gray-900 font-bold">
              {editingChartId ? '譜面を更新' : '譜面を保存'}
            </button>
        </div>

        {/* Right Panel (Editor Lanes) */}
        <div className="flex-grow flex flex-col gap-2 items-center">
          {LANE_COLORS.map((color, index) => (
            <EditorLane 
              ref={el => laneRefs.current[index] = el}
              key={index} lane={index} notes={notes} onNotesChange={setNotes}
              duration={duration} gridWidth={GRID_WIDTH} beatCount={beatCount} gridStep={gridStep}
              colorConfig={color}
            />
          ))}
          <span className="text-xs text-gray-400 mt-2">各レーンをクリックしてノーツを追加/削除</span>
        </div>
      </div>
      )}
    </div>
  );
}
