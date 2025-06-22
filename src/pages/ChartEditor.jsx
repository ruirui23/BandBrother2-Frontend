import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { FaTrash } from 'react-icons/fa';

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
  { name: 'Orange', bg: 'bg-orange-900/50', border: 'border-orange-400', note: 'bg-orange-300', noteBorder: 'border-orange-500' },
  { name: 'Pink', bg: 'bg-pink-900/50', border: 'border-pink-400', note: 'bg-pink-300', noteBorder: 'border-pink-500' },
  { name: 'Cyan', bg: 'bg-cyan-900/50', border: 'border-cyan-400', note: 'bg-cyan-300', noteBorder: 'border-cyan-500' },
  { name: 'Green', bg: 'bg-green-900/50', border: 'border-green-400', note: 'bg-green-300', noteBorder: 'border-green-500' },
];

const EditorLane = React.memo(({ lane, notes, onNotesChange, duration, gridWidth, beatCount, gridStep, colorConfig }) => {
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
    <div className={`w-full h-24 ${colorConfig.bg} rounded-xl border-2 ${colorConfig.border} shadow-inner flex items-center justify-center relative overflow-x-auto`} style={{ minWidth: 800, maxWidth: 1400 }}>
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ width: gridWidth, height: '100%' }}
        onClick={handleGridClick}
      >
        {Array.from({ length: beatCount + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-white/20"
            style={{ left: i * gridStep }}
          />
        ))}
        {notes.filter(n => n.lane === lane).map((n, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${colorConfig.note} ${colorConfig.noteBorder} border-2 shadow-lg`}
            style={{
              left: getX(n.time) - NOTE_RADIUS,
              top: '50%' ,
              transform: 'translateY(-50%)',
              width: NOTE_RADIUS * 2,
              height: NOTE_RADIUS * 2,
              zIndex: 20,
            }}
          />
        ))}
      </div>
    </div>
  );
});

export default function ChartEditor() {
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(120);
  const [duration, setDuration] = useState(28);
  const [notes, setNotes] = useState([]);
  const [selectedSong, setSelectedSong] = useState(LOCAL_SONGS[0].url);
  const [audioError, setAudioError] = useState(false);
  const [customAudioFile, setCustomAudioFile] = useState(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const audioRef = useRef(null);
  const navigate = useNavigate();

  const [editingChartId, setEditingChartId] = useState(null);
  const [userCharts, setUserCharts] = useState([]);
  const [isChartListVisible, setIsChartListVisible] = useState(false);

  useEffect(() => {
    const fetchUserCharts = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, 'charts'), where('createdBy', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      setUserCharts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    if (isChartListVisible) {
      fetchUserCharts();
    }
  }, [isChartListVisible]);

  const loadChart = (chart) => {
    setTitle(chart.title);
    setBpm(chart.bpm);
    setDuration(chart.duration || 15);
    setNotes(chart.notes || []);
    setSelectedSong(chart.audio);
    setEditingChartId(chart.id);
    setIsChartListVisible(false);
  };

  const handleNewChart = () => {
    setTitle('');
    setBpm(120);
    setDuration(28);
    setNotes([]);
    setSelectedSong(LOCAL_SONGS[0].url);
    setEditingChartId(null);
  };

  const handleDeleteChart = async (chartIdToDelete) => {
    if (window.confirm("本当にこの譜面を削除しますか？この操作は取り消せません。")) {
      try {
        await deleteDoc(doc(db, 'charts', chartIdToDelete));
        setUserCharts(prevCharts => prevCharts.filter(chart => chart.id !== chartIdToDelete));
        if (editingChartId === chartIdToDelete) {
          handleNewChart();
        }
        alert("譜面を削除しました。");
      } catch (error) {
        console.error("譜面の削除に失敗しました: ", error);
        alert("譜面の削除中にエラーが発生しました。");
      }
    }
  };

  // 音声ファイル変更時の処理
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      setAudioError(false);
    }
  }, [selectedSong, uploadedAudioUrl]);

  // 音声の長さの自動検出は意図せず上書きするため無効化
  const handleAudioLoadedMetadata = () => {};
  
  // ボタンクリックで音源の長さに同期する関数
  const syncDurationToAudio = () => {
    if (audioRef.current && audioRef.current.duration) {
      const audioDuration = Math.ceil(audioRef.current.duration);
      setDuration(audioDuration);
      alert(`譜面の長さを音源の長さに同期しました: ${audioDuration}秒`);
    } else {
      alert("音源が読み込まれていないか、長さを取得できません。");
    }
  };

  // カスタム音声ファイルのアップロード処理
  const handleAudioUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      alert('音声ファイルを選択してください');
      return;
    }
    
    // ファイルサイズチェック (50MB制限)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('ファイルサイズが大きすぎます。50MB以下のファイルを選択してください。');
      return;
    }
    
    // 認証状態チェック
    if (!auth.currentUser) {
      alert('Firebase Storageにアップロードするには認証が必要です。ログインしてください。');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setCustomAudioFile(file);
    
    try {
      // Firebase Storageに直接アップロード（シンプル版）
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `music/${fileName}`);
      
      console.log('アップロード開始:', fileName);
      console.log('認証状態:', auth.currentUser ? 'ログイン済み' : '未ログイン');
      console.log('ストレージ参照:', storageRef);
      
      // まずシンプルなuploadBytesを試す
      setUploadProgress(50); // 中間表示
      const snapshot = await uploadBytes(storageRef, file);
      console.log('アップロード完了:', snapshot);
      
      setUploadProgress(75); // 進行状況更新
      
      // ダウンロードURL取得
      const downloadURL = await getDownloadURL(storageRef);
      console.log('ダウンロードURL取得成功:', downloadURL);
      
      setUploadedAudioUrl(downloadURL);
      setSelectedSong(downloadURL);
      setIsUploading(false);
      setUploadProgress(0);
      
      alert('音声ファイルのアップロードが完了しました！');
      
    } catch (error) {
      console.error('アップロードエラー:', error);
      console.error('エラーコード:', error.code);
      console.error('エラーメッセージ:', error.message);
      
      setIsUploading(false);
      setUploadProgress(0);
      
      switch (error.code) {
        case 'storage/unauthorized':
          alert('Firebase Storageへのアクセス権限がありません。\nFirebase ConsoleでStorage Rulesを確認してください。');
          break;
        case 'storage/canceled':
          alert('アップロードがキャンセルされました。');
          break;
        case 'storage/unknown':
          alert('不明なエラーが発生しました。Firebase Storageの設定を確認してください。');
          break;
        case 'storage/retry-limit-exceeded':
          alert('アップロードのリトライ回数上限に達しました。\nネットワーク接続を確認してください。');
          break;
        default:
          alert(`アップロードに失敗しました\nエラーコード: ${error.code}\nメッセージ: ${error.message}`);
      }
    }
  };

  // 音声エラーハンドリング
  const handleAudioError = () => {
    setAudioError(true);
    console.error('音声ファイルの読み込みに失敗しました:', selectedSong);
  };

  // BPMに応じてボード長さを調整
  const beatCount = Math.floor((bpm / 60) * duration);
  const GRID_WIDTH = Math.max(GRID_WIDTH_BASE, beatCount * 40); // 1拍40pxで伸縮
  const gridStep = GRID_WIDTH / beatCount;

  const saveChart = async () => {
    if (!title || !selectedSong) {
      alert('タイトルと音源は必須です');
      return;
    }
    
    if (!selectedSong.startsWith('http') && !selectedSong.startsWith('/')) {
      alert('無効な音源URLです。音源を再選択してください。');
      return;
    }
    
    if(notes.length === 0){
      if(!confirm('ノーツがありませんが保存しますか？')) return;
    }

    const isUploadedAudio = selectedSong === uploadedAudioUrl && uploadedAudioUrl;

    const chartData = {
      title,
      bpm: Number(bpm),
      duration: Number(duration), // durationをNumberとして保存
      notes,
      audio: isUploadedAudio ? uploadedAudioUrl : selectedSong,
      createdBy: auth.currentUser.uid,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingChartId) {
        await updateDoc(doc(db, 'charts', editingChartId), chartData);
        alert('譜面を更新しました！');
      } else {
        const docRef = await addDoc(collection(db, 'charts'), {
          ...chartData,
          createdAt: serverTimestamp(),
        });
        setEditingChartId(docRef.id);
        alert('譜面を保存しました！');
      }
    } catch (error) {
      console.error('譜面の保存に失敗しました: ', error);
      alert('譜面の保存中にエラーが発生しました。');
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

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-white mb-6 text-center tracking-wider">譜面作成</h1>
        
        {isChartListVisible ? (
          <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-lg">
              <h3 className="text-2xl font-bold text-white mb-4">保存した譜面一覧</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userCharts.length > 0 ? (
                  userCharts.map(chart => (
                    <div key={chart.id} className="flex items-center gap-2 bg-gray-700 p-2 rounded-lg">
                      <button onClick={() => loadChart(chart)} className="flex-grow text-left px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white transition">
                        {chart.title}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChart(chart.id);
                        }}
                        className="p-3 bg-red-600 hover:bg-red-700 rounded text-white transition"
                        title="削除"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">保存された譜面はありません。</p>
                )}
              </div>
              <button onClick={() => setIsChartListVisible(false)} className="mt-6 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold transition">
                閉じる
              </button>
            </div>
          </div>
        ) : (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* 左側：操作パネル */}
          <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full md:w-80 flex-shrink-0">
            <div className="flex flex-wrap items-end gap-6 w-full justify-center mb-4">
              <div className='flex gap-4'>
                <button onClick={handleNewChart} className="px-4 py-2 bg-blue-500 text-white rounded self-end">新規作成</button>
                <button onClick={() => setIsChartListVisible(true)} className="px-4 py-2 bg-purple-500 text-white rounded self-end">譜面を読み込む</button>
              </div>
              <div className="flex flex-col items-start">
                <label className="text-white text-base mb-1" htmlFor="title-input">譜面タイトル</label>
                <input
                  id="title-input"
                  className="border p-2 rounded w-48 text-lg bg-gray-300 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="譜面タイトル"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col items-start">
                <label className="text-white text-base mb-1" htmlFor="bpm-input">BPM</label>
                <input
                  id="bpm-input"
                  className="border p-2 rounded w-24 text-lg bg-gray-300 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  type="number"
                  value={bpm}
                  onChange={e => setBpm(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col items-start">
                <label className="text-white text-base mb-1" htmlFor="duration-input">長さ(秒)</label>
                <input
                  id="duration-input"
                  className="border p-2 rounded w-24 text-lg bg-gray-300 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col items-start">
                <label className="text-white text-base mb-1" htmlFor="music-select">BGM</label>
                <div className="flex flex-col gap-2">
                  <select
                    id="music-select"
                    className="border p-2 rounded w-48 text-lg bg-gray-300 text-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    value={selectedSong}
                    onChange={e => setSelectedSong(e.target.value)}
                  >
                    {LOCAL_SONGS.map(song => (
                      <option key={song.url} value={song.url}>{song.title}</option>
                    ))}
                    {uploadedAudioUrl && (
                      <option value={uploadedAudioUrl}>アップロードした音源</option>
                    )}
                  </select>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        className="text-xs text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                        disabled={isUploading}
                      />
                      {isUploading && (
                        <span className="text-xs text-yellow-400">アップロード中... {uploadProgress}%</span>
                      )}
                    </div>
                    {isUploading && (
                      <div className="w-48 bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <audio 
                  ref={audioRef} 
                  src={selectedSong || uploadedAudioUrl} 
                  loop 
                  className="hidden" 
                  onError={handleAudioError}
                  onLoadedMetadata={handleAudioLoadedMetadata}
                />
                {audioError && (
                  <span className="text-xs text-red-400 mt-1">音声ファイル読み込みエラー</span>
                )}
              </div>
              <div className="flex items-end ml-4">
                <button
                  onClick={handlePlayPause}
                  className={`py-2 px-6 font-bold rounded-l-xl ${
                    audioError 
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                  disabled={audioError}
                >
                  再生/停止
                </button>
                <button
                  className="py-2 px-8 bg-yellow-400 hover:bg-yellow-500 text-blue-700 font-bold rounded-r-xl shadow-lg transition text-lg"
                  onClick={saveChart}
                >
                  {editingChartId ? '更新する' : '保存する'}
                </button>
              </div>
            </div>
            <hr className="my-6 border-gray-600" />
            
            <h3 className="text-xl font-bold text-white mb-3">譜面情報</h3>
            <input
              type="text"
              placeholder="譜面タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                placeholder="BPM"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value) || 0)}
                className="w-1/2 px-3 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="長さ(秒)"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 0)}
                className="w-1/2 px-3 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={syncDurationToAudio}
              className="w-full mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-bold transition text-sm"
            >
              音源の長さに同期
            </button>
          </div>

          <div className="w-full flex flex-col gap-2 items-center">
            {LANE_COLORS.map((color, index) => (
              <EditorLane 
                key={index}
                lane={index}
                notes={notes}
                onNotesChange={setNotes}
                duration={duration}
                gridWidth={GRID_WIDTH}
                beatCount={beatCount}
                gridStep={gridStep}
                colorConfig={color}
              />
            ))}
            <span className="text-xs text-gray-300 mt-2">各レーンをクリックしてノーツを追加/削除</span>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
