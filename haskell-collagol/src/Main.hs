module Main where

import           Happstack.Server
import           Control.Monad.Cont                       ( msum )
import           Happstack.Server.Routing                 ( dir )

myConf :: Conf
myConf = nullConf { port = 8080 }

main :: IO ()
main = do
  putStrLn "Program start"
  simpleHTTP myConf $ serveDirectory EnableBrowsing [] "."
