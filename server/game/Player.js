/**
 * Player model for Bugbl.io
 */
class Player {
  constructor(socketId, name) {
    this.socketId = socketId;
    this.name = name;
    this.score = 0;
    this.roundScore = 0;
    this.hasGuessed = false;
    this.isDrawing = false;
    this.isConnected = true;
    this.avatar = this.generateAvatar();
    this.joinedAt = Date.now();
    this.drawnThisCycle = false;
  }

  /**
   * Generate a random avatar color for the player
   */
  generateAvatar() {
    const colors = [
      '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
      '#a855f7', '#ff6f91', '#00d4ff', '#39ff14',
      '#ff9f43', '#ee5a24', '#0abde3', '#f368e0',
      '#01a3a4', '#c44569', '#574b90', '#e77f67'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Add points to the player's score
   */
  addScore(points) {
    this.roundScore = points;
    this.score += points;
  }

  /**
   * Reset round-specific state
   */
  resetRound() {
    this.hasGuessed = false;
    this.isDrawing = false;
    this.roundScore = 0;
  }

  /**
   * Reset all state for a new game
   */
  resetGame() {
    this.score = 0;
    this.roundScore = 0;
    this.hasGuessed = false;
    this.isDrawing = false;
  }

  /**
   * Serialize player data for client
   */
  toJSON() {
    return {
      socketId: this.socketId,
      name: this.name,
      score: this.score,
      roundScore: this.roundScore,
      hasGuessed: this.hasGuessed,
      isDrawing: this.isDrawing,
      isConnected: this.isConnected,
      avatar: this.avatar
    };
  }
}

module.exports = Player;
