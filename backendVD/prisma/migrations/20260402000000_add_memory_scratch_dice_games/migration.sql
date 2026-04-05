-- AlterEnum: Add new game types
ALTER TYPE "GameType" ADD VALUE 'MEMORY';
ALTER TYPE "GameType" ADD VALUE 'SCRATCH';
ALTER TYPE "GameType" ADD VALUE 'DICE';

-- AlterEnum: Add new gram source types for new games
ALTER TYPE "GramSourceType" ADD VALUE 'GAME_MEMORY';
ALTER TYPE "GramSourceType" ADD VALUE 'GAME_SCRATCH';
ALTER TYPE "GramSourceType" ADD VALUE 'GAME_DICE';
