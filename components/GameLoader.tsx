import React, { useState, useRef, useEffect } from 'react';
import { LightbulbIcon } from './icons';

interface GameLoaderProps {
  message: string;
}

const CANVAS_X = 400;
const CANVAS_Y = 400;
const INITIAL_SNAKE = [[10, 15]];
const INITIAL_APPLE = [10, 5];
const SCALE = 20;
const SPEED = 100;

interface Direction {
  x: number;
  y: number;
}

const GameLoader: React.FC<GameLoaderProps> = ({ message }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<number[][]>(INITIAL_SNAKE);
  const [apple, setApple] = useState<number[]>(INITIAL_APPLE);
  const [direction, setDirection] = useState<Direction>({ x: 0, y: 0 });
  const [delay, setDelay] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);

  // Carregar High Score
  useEffect(() => {
    const stored = localStorage.getItem('snake-highscore');
    if (stored) setHighScore(Number(stored));
  }, []);

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      // Resetar transformação para desenhar a grid
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, CANVAS_X, CANVAS_Y);
      
      // Desenhar grid cinza mais claro
      context.strokeStyle = '#f3f4f6';
      context.lineWidth = 1;
      context.beginPath();
      
      // Linhas verticais
      for (let x = 0; x <= CANVAS_X / SCALE; x++) {
        context.moveTo(x * SCALE, 0);
        context.lineTo(x * SCALE, CANVAS_Y);
      }
      
      // Linhas horizontais
      for (let y = 0; y <= CANVAS_Y / SCALE; y++) {
        context.moveTo(0, y * SCALE);
        context.lineTo(CANVAS_X, y * SCALE);
      }
      
      context.stroke();
      
      // Aplicar transformação para desenhar a cobra e a maçã
      context.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      
      // Desenhar cobra azul
      context.fillStyle = '#3b82f6'; // Azul
      snake.forEach(([x, y], index) => {
        if (index === 0) {
          // Cabeça da cobra com um ponto claro no centro
          context.fillRect(x, y, 1, 1);
          context.fillStyle = 'rgba(255, 255, 255, 0.4)';
          context.beginPath();
          context.arc(x + 0.5, y + 0.5, 0.15, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = '#3b82f6';
        } else {
          context.fillRect(x, y, 1, 1);
        }
      });
      
      // Desenhar maçã redondinha
      context.fillStyle = '#ff0000';
      context.beginPath();
      context.arc(apple[0] + 0.5, apple[1] + 0.5, 0.45, 0, Math.PI * 2);
      context.fill();
      
      // Brilho na maçã
      context.fillStyle = 'rgba(255, 255, 255, 0.3)';
      context.beginPath();
      context.arc(apple[0] + 0.5, apple[1] + 0.5, 0.3, 0, Math.PI * 2);
      context.fill();
    }
  }, [snake, apple, gameOver]);

  useEffect(() => {
    if (delay !== null) {
      const interval = setInterval(runGame, delay);
      return () => clearInterval(interval);
    }
  }, [snake, apple, direction, delay]);

  const runGame = () => {
    const newSnake = [...snake];
    const newSnakeHead = [
      newSnake[0][0] + direction.x,
      newSnake[0][1] + direction.y,
    ];

    newSnake.unshift(newSnakeHead);

    if (checkCollision(newSnakeHead)) {
      setDelay(null);
      setGameOver(true);
      return;
    }

    if (checkAppleCollision(newSnakeHead)) {
      setApple(generateApple());
      setScore(score + 1);
      setHighScore(prev => {
        const newHigh = Math.max(prev, score + 1);
        localStorage.setItem('snake-highscore', String(newHigh));
        return newHigh;
      });
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  };

  const checkCollision = (head: number[]): boolean => {
    // Colisão com paredes
    if (
      head[0] < 0 ||
      head[0] >= CANVAS_X / SCALE ||
      head[1] < 0 ||
      head[1] >= CANVAS_Y / SCALE
    ) {
      return true;
    }
    // Colisão com o próprio corpo
    for (const segment of snake) {
      if (head[0] === segment[0] && head[1] === segment[1]) {
        return true;
      }
    }
    return false;
  };

  const checkAppleCollision = (head: number[]): boolean => {
    return head[0] === apple[0] && head[1] === apple[1];
  };

  const generateApple = (): number[] => {
    let newApple: number[];
    let isOnSnake: boolean;
    do {
      newApple = [
        Math.floor(Math.random() * (CANVAS_X / SCALE)),
        Math.floor(Math.random() * (CANVAS_Y / SCALE)),
      ];
      isOnSnake = snake.some(s => s[0] === newApple[0] && s[1] === newApple[1]);
    } while (isOnSnake);
    return newApple;
  };

  const changeDirection = (e: React.KeyboardEvent<HTMLDivElement> | KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        if (direction.y === 0) setDirection({ x: 0, y: -1 });
        break;
      case 'ArrowDown':
      case 's':
        if (direction.y === 0) setDirection({ x: 0, y: 1 });
        break;
      case 'ArrowLeft':
      case 'a':
        if (direction.x === 0) setDirection({ x: -1, y: 0 });
        break;
      case 'ArrowRight':
      case 'd':
        if (direction.x === 0) setDirection({ x: 1, y: 0 });
        break;
    }
  };

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setApple(INITIAL_APPLE);
    setDirection({ x: 0, y: -1 });
    setDelay(SPEED);
    setScore(0);
    setGameOver(false);
  };

  // Controles de teclado global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        return;
      }

      // Espaço para reiniciar quando game over
      if (e.key === ' ') {
        e.preventDefault();
        if (gameOver) {
          startGame();
        }
        return;
      }

      // Setas para mover
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd'].includes(e.key)) {
        e.preventDefault();
        changeDirection(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameOver]);

  // Iniciar o jogo automaticamente quando o componente montar
  useEffect(() => {
    if (delay === null && !gameOver) {
      setDirection({ x: 0, y: -1 });
      setDelay(SPEED);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full animate-fade-in-up bg-[#F9FAFB]">
      
      {/* Cabeçalho */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 mb-4">
            <LightbulbIcon className="w-7 h-7 text-brand-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          Analisando Relatório
        </h3>
        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
          A IA está processando seu documento.
        </p>
      </div>

      {/* Container do Jogo */}
      <div className="relative">
        {/* Placar - Posicionado acima do canvas */}
        <div className="flex justify-between items-end w-[400px] mb-4 px-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pontuação</span>
            <span className="text-2xl font-bold text-gray-900 font-display">{score}</span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recorde</span>
             <span className="text-lg font-semibold text-brand-600">{highScore}</span>
          </div>
        </div>

        {/* Canvas do Jogo com overlay de Game Over */}
        <div className="relative">
          <div
            onKeyDown={changeDirection}
            tabIndex={0}
            style={{ outline: 'none' }}
            className="bg-white rounded-xl shadow-float border border-gray-200 overflow-hidden relative"
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_X}
              height={CANVAS_Y}
              style={{ display: 'block' }}
            />

            {/* Game Over Overlay - Exatamente como nos prints */}
            {gameOver && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 rounded-xl">
                <span className="text-2xl font-bold text-gray-900 mb-2">Fim de Jogo!</span>
                <span className="text-sm text-gray-500 mb-6 font-medium">Pontuação Final: {score}</span>
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Jogar Novamente
                </button>
                <span className="text-[10px] text-gray-400 mt-4 uppercase tracking-wider font-bold">Espaço para reiniciar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé / Status */}
      <div className="mt-8 flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-8 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                    <span className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center bg-white">←</span>
                    <span className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center bg-white">↑</span>
                    <span className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center bg-white">↓</span>
                    <span className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center bg-white">→</span>
                </div>
                <span>Mover</span>
            </div>
        </div>
        
        <div className="flex items-center justify-center text-brand-700 bg-brand-50 py-2 px-5 rounded-full border border-brand-100 shadow-sm">
            <div className="w-3 h-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-xs font-semibold truncate max-w-[250px]">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default GameLoader;
