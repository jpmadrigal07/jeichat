// changelog.config.js
module.exports = {
  types: [
    { type: 'feat', section: '✨ Features', hidden: false },
    { type: 'fix', section: '🐛 Bug Fixes', hidden: false },
    { type: 'docs', section: '📚 Documentation', hidden: true },
    { type: 'chore', section: '🧹 Chores', hidden: false },
    { type: 'refactor', section: '🔨 Refactors', hidden: true },
    { type: 'perf', section: '⚡ Performance', hidden: true },
    { type: 'test', section: '🧪 Tests', hidden: true },
    { type: 'build', section: '🏗 Build System', hidden: true },
    { type: 'ci', section: '🤖 CI/CD', hidden: true },
  ],
};
