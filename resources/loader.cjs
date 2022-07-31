const { createDecipheriv } = require('crypto');
const data = Buffer.from('%data%', 'base64');

module.exports = {
  loader: (algorithm, key, iv) => {
    const cipher = createDecipheriv(algorithm, key, iv)
    const result = cipher.update(data);
    return JSON.parse(Buffer.concat([result, cipher.final()]).toString('utf-8'));
  }
}
