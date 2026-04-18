/**
 * Developer-themed word list for Bugbl.io
 * Words split by difficulty: easy / medium / hard
 */

const words = {
  easy: [
    'apple', 'banana', 'orange', 'grape', 'pear', 'lemon', 'cherry',
    'cat', 'dog', 'cow', 'pig', 'duck', 'bird', 'fish', 'frog',
    'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'tree', 'flower',
    'car', 'bus', 'bike', 'boat', 'plane', 'train', 'truck',
    'book', 'door', 'bed', 'desk', 'chair', 'key', 'lock', 'bell',
    'hat', 'shoe', 'sock', 'shirt', 'watch', 'ring', 'phone', 'bag'
  ],

  medium: [
    'octopus', 'elephant', 'giraffe', 'penguin', 'kangaroo', 'dolphin',
    'rainbow', 'mountain', 'volcano', 'island', 'beach', 'desert',
    'computer', 'keyboard', 'laptop', 'camera', 'remote', 'battery',
    'pizza', 'burger', 'donut', 'cookie', 'coffee', 'teapot',
    'hammer', 'wrench', 'ladder', 'bridge', 'castle', 'statue',
    'guitar', 'drums', 'piano', 'violin', 'trumpet', 'flute',
    'hockey', 'soccer', 'tennis', 'bowling', 'boxing', 'skiing'
  ],

  hard: [
    'microscope', 'telescope', 'satellite', 'astronaut', 'spaceship',
    'metropolis', 'lighthouse', 'windmill', 'skyscraper', 'aquarium',
    'symphony', 'orchestra', 'sculpture', 'portrait', 'canvas',
    'electricity', 'magnet', 'gravity', 'skeleton', 'brain', 'heart',
    'sandwich', 'spaghetti', 'sushi', 'pancake', 'lemonade',
    'butterfly', 'scorpian', 'dinosaur', 'unicorn', 'dragon'
  ]
};

/**
 * Get all words flat (used for random/quick-play mode)
 */
function getAllWords() {
  return [...words.easy, ...words.medium, ...words.hard];
}

/**
 * Get N random words filtered by difficulty.
 * difficulty: 'easy' | 'medium' | 'hard' | 'random'
 */
function getRandomWords(count = 3, exclude = [], difficulty = 'random') {
  let pool;
  if (difficulty === 'easy')   pool = words.easy;
  else if (difficulty === 'medium') pool = words.medium;
  else if (difficulty === 'hard')   pool = words.hard;
  else pool = getAllWords(); // 'random' = all

  const available = pool.filter(w => !exclude.includes(w));
  const shuffled  = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function checkGuess(guess, word) {
  return guess.trim().toLowerCase() === word.trim().toLowerCase();
}

function isCloseGuess(guess, word) {
  const g = guess.trim().toLowerCase();
  const w = word.trim().toLowerCase();
  if (g === w) return false;
  if (w.includes(g) || g.includes(w)) return true;
  if (!w.includes(' ') && !g.includes(' ')) {
    const dist = levenshtein(g, w);
    return dist <= 2 && dist > 0;
  }
  return false;
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function generateHint(word, revealPercent = 0) {
  const chars = word.split('');
  const letterIndices = chars
    .map((c, i) => (c !== ' ' ? i : -1))
    .filter(i => i !== -1);
  const numToReveal = Math.floor(letterIndices.length * revealPercent);
  const shuffledIndices = [...letterIndices].sort(() => Math.random() - 0.5);
  const revealSet = new Set(shuffledIndices.slice(0, numToReveal));
  
  return chars
    .map((c, i) => {
      if (c === ' ') return ' '; // Keep space as a single space
      if (revealSet.has(i)) return c;
      return '_';
    })
    .join(''); // IMPORTANT: No spaces between chars anymore!
}

module.exports = {
  words,
  getAllWords,
  getRandomWords,
  checkGuess,
  isCloseGuess,
  generateHint
};
