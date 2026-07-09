export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'always'],
    'subject-case': [0],
    'subject-max-length': [2, 'always', 72],
  },
};
