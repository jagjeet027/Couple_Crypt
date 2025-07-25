import React, { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Users, Bot } from 'lucide-react';

const TicTacToe = ({ onBack }) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [gameMode, setGameMode] = useState('pvp'); // 'pvp' or 'ai'
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [gameHistory, setGameHistory] = useState([]);
  const [isThinking, setIsThinking] = useState(false);              

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];
    
    for (let line of lines) {
      const [a, b, c] = line;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line };
      }
    }
    return null;
  };

  const isBoardFull = (squares) => {
    return squares.every(square => square !== null);
  };

  // AI Logic - Minimax Algorithm
  const minimax = (squares, depth, isMaximizing) => {
    const result = calculateWinner(squares);
    
    if (result?.winner === 'O') return 10 - depth;
    if (result?.winner === 'X') return depth - 10;
    if (isBoardFull(squares)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'O';
          const score = minimax(squares, depth + 1, false);
          squares[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'X';
          const score = minimax(squares, depth + 1, true);
          squares[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getBestMove = (squares) => {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = 'O';
        const score = minimax(squares, 0, false);
        squares[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  };

  // AI Move
  useEffect(() => {
    if (gameMode === 'ai' && !isXNext && !calculateWinner(board) && !isBoardFull(board)) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        const bestMove = getBestMove([...board]);
        if (bestMove !== -1) {
          const newBoard = [...board];
          newBoard[bestMove] = 'O';
          setBoard(newBoard);
          setIsXNext(true);
        }
        setIsThinking(false);
      }, 500); // Add delay for better UX

      return () => clearTimeout(timer);
    }
  }, [board, isXNext, gameMode]);

  const handleClick = (index) => {
    if (board[index] || calculateWinner(board) || isThinking) return;
    if (gameMode === 'ai' && !isXNext) return; // Prevent clicking during AI turn

    const newBoard = board.slice();
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    
    const result = calculateWinner(newBoard);
    if (result) {
      setScores(prev => ({
        ...prev,
        [result.winner]: prev[result.winner] + 1
      }));
      setGameHistory(prev => [...prev, { board: newBoard, winner: result.winner }]);
    } else if (isBoardFull(newBoard)) {
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      setGameHistory(prev => [...prev, { board: newBoard, winner: 'draw' }]);
    }
    
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setIsThinking(false);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    setGameHistory([]);
    resetGame();
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && isBoardFull(board);
  
  let status;
  if (winner) {
    status = `Winner: ${winner.winner}`;
  } else if (isDraw) {
    status = "It's a draw!";
  } else if (gameMode === 'ai' && !isXNext && isThinking) {
    status = "AI is thinking...";
  } else {
    status = `Next player: ${isXNext ? 'X' : 'O'}${gameMode === 'ai' ? (isXNext ? ' (You)' : ' (AI)') : ''}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1 className="text-3xl font-bold text-white">⭕ Tic Tac Toe</h1>
            <button 
              onClick={resetGame}
              className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RotateCcw size={20} />
              Reset
            </button>
          </div>

          <div className="bg-white rounded-xl p-6">
            {/* Game Mode Selection */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => {
                  setGameMode('pvp');
                  resetGame();
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                  gameMode === 'pvp' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Users size={20} />
                Player vs Player
              </button>
              <button
                onClick={() => {
                  setGameMode('ai');
                  resetGame();
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                  gameMode === 'ai' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Bot size={20} />
                Player vs AI
              </button>
            </div>

            {/* Score Board */}
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">X Wins</div>
                <div className="text-3xl font-bold">{scores.X}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">Draws</div>
                <div className="text-3xl font-bold">{scores.draws}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">O Wins</div>
                <div className="text-3xl font-bold">{scores.O}</div>
              </div>
            </div>

            {/* Game Status */}
            <div className="text-center mb-6">
              <div className={`text-xl font-bold mb-4 ${
                winner?.winner === 'X' ? 'text-blue-600' : 
                winner?.winner === 'O' ? 'text-red-600' : 
                isDraw ? 'text-gray-600' : 'text-gray-800'
              }`}>
                {status}
              </div>
              
              {(winner || isDraw) && (
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={resetGame}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Play Again
                  </button>
                  <button 
                    onClick={resetScores}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Reset Scores
                  </button>
                </div>
              )}
            </div>

            {/* Game Board */}
            <div className="flex justify-center mb-6">
              <div className="grid grid-cols-3 gap-2 w-80 h-80">
                {board.map((square, index) => (
                  <button
                    key={index}
                    onClick={() => handleClick(index)}
                    disabled={isThinking}
                    className={`w-full h-full bg-white border-4 text-6xl font-bold transition-all duration-200 rounded-lg ${
                      winner?.line?.includes(index) 
                        ? 'border-green-500 bg-green-100' 
                        : 'border-gray-400 hover:border-gray-600 hover:bg-gray-50'
                    } ${
                      square === 'X' ? 'text-blue-600' : 'text-red-600'
                    } ${
                      isThinking ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    {square}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Statistics */}
            {gameHistory.length > 0 && (
              <div className="text-center">
                <h3 className="text-lg font-bold mb-2 flex items-center justify-center gap-2">
                  <Trophy size={20} className="text-yellow-500" />
                  Game Statistics
                </h3>
                <div className="text-gray-600">
                  Total Games: {gameHistory.length} | 
                  Win Rate (X): {gameHistory.length > 0 ? ((scores.X / gameHistory.length) * 100).toFixed(1) : 0}% | 
                  Win Rate (O): {gameHistory.length > 0 ? ((scores.O / gameHistory.length) * 100).toFixed(1) : 0}%
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 text-center text-gray-600">
              <p className="mb-2">
                <strong>How to play:</strong> Get three marks in a row (horizontally, vertically, or diagonally) to win!
              </p>
              {gameMode === 'ai' && (
                <p className="text-sm">
                  <strong>AI Mode:</strong> You are X, AI is O. The AI uses minimax algorithm for optimal play.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;