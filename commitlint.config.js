module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'WP-0.1', 'WP-0.2', 'WP-0.3', 'WP-0.4', 'WP-0.5', 'WP-0.6',
        'WP-1.1', 'WP-1.2', 'WP-1.3', 'WP-1.4', 'WP-1.5', 'WP-1.6',
        'org-config', 'hrm', 'projects', 'tickets', 'finance', 'assets',
        'process', 'lms', 'scout', 'rewards', 'auth', 'events', 'core',
        'shared', 'ui', 'tokens', 'constants', 'infra', 'ci', 'docs', 'spec',
      ],
    ],
    'scope-empty': [1, 'never'],
  },
};
