
module Gol where


import           Data.Array.Unboxed
import           Data.Array.IArray
import           Data.Functor
import           Data.Monoid
import           Debug.Trace

import           System.Random

newtype Board = Board (UArray (Int, Int) Bool)
    deriving (Show)


newBoard :: Int -> Int -> Board
newBoard width height =
  Board $ listArray ((0, 0), (height - 1, width - 1)) ((\_ _ -> False) <$> [0 .. height - 1] <*> [0 .. width - 1])

newRBoard :: Int -> Int -> IO Board
newRBoard width height = do
  l <- mapM (const randomIO) ((\_ _ -> 0) <$> [0 .. height - 1] <*> [0 .. width - 1])
  return . Board $ listArray ((0, 0), (height - 1, width - 1)) l

showBoard :: Board -> String
showBoard (Board b) = concatMap showInd indices
 where
  indices = range $ bounds b
  width   = snd . snd $ bounds b
  showInd i = (if b ! i then "X" else " ") <> if snd i == width then "\n" else ""

nextGen :: Board -> Board
nextGen (Board b) = Board $ listArray (bounds b) (newCell <$> [0 .. height] <*> [0 .. width])
 where
  newCell y x =
    let alive = b ! (y, x)
        count = sum $ map (fromEnum . (b !)) (neighs y x)
    in  (count == 3) || (alive && count == 2)

  (height, width) = snd . bounds $ b

  lol             = [(-1, -1), (-1, 0), (-1, -1), (0, 1), (0, -1), (1, -1), (1, 0), (1, 1)]

  neighs :: Int -> Int -> [(Int, Int)]
  neighs y x = map (\(y2, x2) -> ((y + y2 + height + 1) `mod` (height + 1), (x + x2 + width + 1) `mod` (width + 1))) lol
