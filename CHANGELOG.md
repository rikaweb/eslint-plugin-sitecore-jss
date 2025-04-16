# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2024-04-16

### Changed

- Updated TypeScript peer dependency to be more flexible (`>=4.9.0`)
- Improved compatibility with projects using TypeScript 4.9.x

## [1.1.2] - 2024-04-14

### Changed

- Updated peer dependency for @typescript-eslint/parser to support both v5.0.0 and v6.0.0
- Improved compatibility with projects using different versions of TypeScript ESLint parser

## [1.1.0] - 2024-03-19

### Added

- Full TypeScript support for all rule implementations
- Type-safe rule configurations
- Better type checking utilities for Sitecore field types
- TypeScript declarations for public APIs

### Changed

- Migrated all rule implementations to TypeScript
- Improved type checking in `enforce-file-component`
- Enhanced type safety in `enforce-all-components`
- Updated build process to handle TypeScript compilation

### Fixed

- Type-related issues in utility functions
- Improved type inference for Sitecore field types

## [1.0.0-beta.1] - 2024-01-24

### Added

- Initial release of eslint-plugin-sitecore-jss
- Rule: `enforce-text-component` for proper Text component usage
- Rule: `enforce-richtext-component` for proper RichText component usage
- Rule: `enforce-image-component` for proper Image component usage
- Rule: `enforce-link-component` for proper Link component usage
- Rule: `enforce-file-component` for proper File component usage
- Rule: `enforce-all-components` to enable all component rules
- Auto-fix support for all rules
- TypeScript support
- Documentation for all rules and configuration options

### Changed

- N/A (Initial Release)

### Deprecated

- N/A (Initial Release)

### Removed

- N/A (Initial Release)

### Fixed

- N/A (Initial Release)

### Security

- N/A (Initial Release)

[1.1.3]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.0...v1.1.2
[1.1.0]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.0.0-beta.1...v1.1.0
[1.0.0-beta.1]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/releases/tag/v1.0.0-beta.1
