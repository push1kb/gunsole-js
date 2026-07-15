# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-07-15

### Changed

- Bumped `@gunsole/core` peer dependency floor to `>=0.3.0` and re-exported the new Live Widgets types (`LiveWidgetType`, `LiveWidgetPayload`, `LiveCardData`, `LiveProgressData`, `LiveTableData`, `LiveTableCell`, `LiveChartData`, `LiveLogOptions`). The `liveCard`/`liveProgress`/`liveTable`/`liveChart` client methods flow through automatically.

## [0.2.0] - 2026-03-08

### Added

- Initial release of `@gunsole/web` browser lifecycle package
- `sendBeacon` transport for reliable log delivery on page unload
- Automatic `beforeunload` and `visibilitychange` flush handlers
- Seamless integration with `@gunsole/core`
