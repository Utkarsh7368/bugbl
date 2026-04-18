/**
 * Developer-themed word list for Bugbl.io
 * Words split by difficulty: easy / medium / hard
 */

const words = {
  easy: [
    // Hardware — single obvious objects
    'keyboard', 'mouse', 'monitor', 'laptop', 'headphones',
    'webcam', 'microphone', 'speaker', 'tablet', 'smartwatch',
    'printer', 'router', 'USB stick', 'charging cable',

    // Simple UI / internet things
    'browser', 'email', 'cookie', 'bookmark', 'avatar',
    'hashtag', 'WiFi', 'Bluetooth', 'emoji', 'selfie',
    'dark mode', 'light mode', 'checkbox', 'toggle',

    // Simple visible concepts
    'loop', 'array', 'stack', 'queue', 'bug',
    'key', 'lock', 'cloud', 'map', 'clock',
    'folder', 'file', 'trash', 'search', 'link',

    // Easy dev situations
    'rubber duck', 'coffee cup', 'hoodie', 'terminal',
    'download', 'upload', 'loading', 'error',

    // Widely-known logos (visually the most obvious)
    'Linux',    // Tux the penguin
    'Android',  // green robot
    'Apple',    // bitten apple
    'Windows',  // four squares
    'Git',      // orange branches
    'GitHub',   // octocat
    'Docker',   // whale with containers
    'Python',   // two snakes
    'Java',     // coffee cup
  ],

  medium: [
    // Two-word hardware / situations
    'data center', 'rack server', 'cable mess', 'cooling fan',
    'multiple monitors', 'standing desk', 'mechanical keyboard',

    // UI elements (slightly less obvious)
    'progress bar', 'loading spinner', 'toggle switch', 'search bar',
    'notification bell', 'QR code', 'password field', 'login form',
    'hamburger menu', 'dropdown menu', 'scroll bar', 'popup',
    'sidebar', 'taskbar', 'recycle bin', 'desktop wallpaper',
    'drag and drop', 'colour picker', 'emoji picker',
    'like button', 'share button', 'shopping cart', 'spam folder',
    'video thumbnail', 'subscription bell',

    // Drawable data structures
    'linked list', 'binary tree', 'database', 'network',
    'firewall', 'flowchart', 'pie chart', 'bar chart',
    'timeline', 'pipeline', 'fork', 'branch',

    // Dev situations
    'rubber duck', 'blue screen', 'infinite loop', 'merge conflict',
    'pull request', 'code review', 'pair programming', 'deploy button',
    'standup meeting', 'sticky notes on monitor', 'laptop stickers',
    'whiteboard diagram', 'kanban board', 'sticky note',

    // Medium-difficulty logos
    'JavaScript',   // JS square
    'TypeScript',   // TS square
    'HTML',         // orange shield H5
    'CSS',          // blue shield CSS3
    'React',        // atom electrons
    'Vue',          // green V mountain
    'Node.js',      // green hexagon
    'Rust',         // gear with R
    'Go',           // blue gopher
    'Swift',        // swift bird
    'Ruby',         // red gem
    'PHP',          // purple elephant
    'MongoDB',      // green leaf
    'Redis',        // red star/cube
    'PostgreSQL',   // blue elephant
    'MySQL',        // blue dolphin
    'VS Code',      // blue overlapping squares
    'Slack',        // colourful hashtag
    'Figma',        // colourful circles
  ],

  hard: [
    // Complex hardware/setup
    'motherboard', 'GPU', 'CPU', 'SSD', 'RAM', 'antenna',
    'cable management', 'dark room setup',

    // Complex UI / internet
    'skeleton screen', 'breadcrumb', 'tooltip', 'captcha',
    'trending arrow', 'follower count', 'profile picture',
    'attachment', 'hyperlink', 'cat photo', 'meme',

    // Complex data structures / architecture
    'folder structure', 'class hierarchy', 'commit graph',
    'function arrow', 'recursion mirror', 'hash table', 'graph',
    'pub sub', 'message queue',

    // Hard dev situations
    'stack overflow', 'hotfix', 'rollback', 'programmer sleeping',
    'spaghetti code', 'tech debt', 'code smell',

    // Hard-to-draw logos
    'Angular',      // red A shield
    'Svelte',       // orange curving flame
    'Next.js',      // black N
    'Kotlin',       // K triangle gradient
    'Dart',         // dart/arrow
    'Flutter',      // diagonal F gradient
    'Haskell',      // purple lambda
    'Scala',        // red S wave
    'Elixir',       // purple drop/potion
    'Clojure',      // green lambda circle
    'Zig',          // yellow Z lightning
    'GraphQL',      // pink hexagonal star
    'WebAssembly',  // Wasm cube
    'Terraform',    // purple T diamond
    'Kubernetes',   // ship wheel / helm
    'Django',       // green on dark
    'Flask',        // flask bottle
    'Laravel',      // L curl
    'Spring',       // green leaf/sprout
    'Rails',        // red diamond on track

    // Extra hard logos
    'Julia',        // three coloured circles
    'Lua',          // dark circle with moon
    'Erlang',       // erl phone-like
    'F#',           // octagonal logo
    'Crystal',      // prismatic gem
    'Nim',          // crown / gold logo
    'Groovy',       // blue G orbit
    'Perl',         // camel
    'Bash',         // terminal $ prompt
    'Solidity',     // blue hexagon S (Ethereum)
    'SQLite',       // blue feather
    'Ubuntu',       // three people in circle
    'Vim',          // green diamond V
    'Emacs',        // purple gnu
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
  if (difficulty === 'easy') pool = words.easy;
  else if (difficulty === 'medium') pool = words.medium;
  else if (difficulty === 'hard') pool = words.hard;
  else pool = getAllWords(); // 'random' = all

  const available = pool.filter(w => !exclude.includes(w));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
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

  // If revealPercent > 0, make sure we reveal at least 1 letter
  let numToReveal = Math.floor(letterIndices.length * revealPercent);
  if (revealPercent > 0 && numToReveal === 0 && letterIndices.length > 0) {
    numToReveal = 1;
  }

  const shuffledIndices = [...letterIndices].sort(() => Math.random() - 0.5);
  const revealSet = new Set(shuffledIndices.slice(0, numToReveal));
  
  return chars
    .map((c, i) => {
      if (c === ' ') return ' '; // Keep single space for words like "Ice Cream"
      if (revealSet.has(i)) return c;
      return '_';
    })
    .join(''); // Compact protocol: No spaces between letters!
}

module.exports = {
  words,
  getAllWords,
  getRandomWords,
  checkGuess,
  isCloseGuess,
  generateHint
};
