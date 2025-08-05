# Unused Code Detection and Cleanup

This document describes the unused code detection and cleanup performed on the AIUB Notice Bot codebase.

## Tools Used

1. **TypeScript Compiler** - Configured with `noUnusedLocals` and `noUnusedParameters` for detecting unused variables
2. **ts-unused-exports** - For detecting unused exports across the codebase
3. **depcheck** - For identifying unused dependencies
4. **npm-check-updates** - For checking dependency update availability

## Changes Made

### Fixed Build Issues
- Created missing `config.json` with all required configuration properties
- Created missing `database/notice.json` with sample data structure
- Added `Notice` type definition for better type safety

### Removed Unused Code
- **39 unused imports** across 16 files removed
- **5 unused variables** removed:
  - `bot_latency` in commands/bot-info.ts
  - `seat_plan_dir` in commands/exam-seat-plan.ts  
  - `existing_news_event` in fetchAllNews.ts
  - `time_element` in utils/aiubNewsFetch.ts
  - `lastNotice` in utils/noticeFetch.ts
  - `style` in helper/htmlToDiscordFormat.ts

### Removed Unused Dependencies
- `child_process` - Not used anywhere in the codebase
- `nwsapi` - Redundant dependency
- `ts-node-dev` - Replaced by `tsx` for development

### Enhanced TypeScript Configuration
- Enabled `noUnusedLocals` to detect unused local variables
- Added npm scripts for ongoing unused code detection:
  - `npm run detect-unused` - Find unused exports
  - `npm run check-deps` - Check for unused dependencies
  - `npm run update-deps` - Check for dependency updates

## Efficiency Improvements

1. **Reduced Bundle Size**: Removed unused imports and dependencies reduce the final bundle size
2. **Better Build Performance**: Fewer imports mean faster TypeScript compilation
3. **Improved Code Maintainability**: Cleaner imports make code easier to understand and maintain
4. **Ongoing Detection**: Added tools and scripts for continuous unused code detection

## Scripts Added

```json
{
  "detect-unused": "ts-unused-exports tsconfig.json",
  "check-deps": "depcheck", 
  "update-deps": "npm-check-updates"
}
```

## Notes

- All command files in `/commands` directory are dynamically loaded, so they appear as "unused exports" but are actually used
- All event handlers in `/handler/events` are dynamically loaded similarly
- The `Notice` type is kept for type safety even though not directly imported
- Dependencies are already up-to-date (checked with npm-check-updates)

## Results

- **Build Status**: ✅ Clean compilation with no unused code warnings
- **Dependencies**: Reduced from 11 to 8 runtime dependencies  
- **Code Quality**: Improved with stricter TypeScript configuration
- **Maintainability**: Added tooling for ongoing unused code detection