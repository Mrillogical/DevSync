class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode=400]
   * @param {Record<string, unknown>} [details]
   */
  constructor(message, statusCode = 400, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = { AppError };
