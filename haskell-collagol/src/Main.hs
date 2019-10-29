{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE FlexibleContexts #-}

module Main where


import           Control.Monad                            ( msum
                                                          , forever
                                                          )
import           Control.Monad.Trans                      ( liftIO )
import           Data.Text                                ( Text )
import qualified Data.Text.IO                  as T
import           Happstack.Server
import           Websocket                                ( runWebSocketsHappstack )
import           Network.WebSockets                hiding ( Response )
import           Control.Exception.Base                   ( catch
                                                          , throwIO
                                                          )
import           Control.Monad.Cont                       ( MonadIO
                                                          , when
                                                          , liftM2
                                                          )
import           Control.Monad.State                      ( MonadState
                                                          , gets
                                                          , get
                                                          , modify
                                                          )
import           Data.List
import           GHC.Base                                 ( liftA2 )

import           Gol
import           Control.Monad
import           System.CPUTime                           ( getCPUTime )

main :: IO ()
main = do
  b <- newRBoard 2048 2048
  foldM_
    (\b _ -> do
      startTime <- getCPUTime
      seq b (putStrLn "ok!") -- (showBoard b)
      finishTime <- getCPUTime
      print $ fromIntegral (finishTime - startTime) / 1000000000000
      getLine
      return $ nextGen b
    )
    b
    [0 .. 1000]
  putStrLn $ "Starting server on port " ++ show (port myConf)
  simpleHTTP myConf echoServerPart

echoApp :: ServerApp
echoApp pendingConnection =
  do
      conn <- acceptRequest pendingConnection
      forever $ do
        t <- receiveData conn :: IO Text
        liftIO $ T.putStrLn t
        sendTextData conn t
    `catch` handleExcept

handleExcept :: ConnectionException -> IO ()
handleExcept x = case x of
  CloseRequest _ _   -> return ()
  ConnectionClosed   -> return ()
  ParseException   _ -> return ()
  UnicodeException _ -> return ()


echoServerPart :: ServerPart Response
echoServerPart = msum
  [ nullDir >> serveFile (asContentType "text/html") "../client/Main.jsexe/index.html"
  , dir "rts.js" $ serveFile (asContentType "text/javascript") "../client/Main.jsexe/rts.js"
  , dir "runmain.js" $ serveFile (asContentType "text/javascript") "../client/Main.jsexe/runmain.js"
--          , dir "echo.js" $ serveFile (asContentType "text/javascript") "echo.js"
  , dir "echo" $ do
    runWebSocketsHappstack echoApp
    ok $ toResponse ()
  ]

myConf :: Conf
myConf = nullConf { port = 8080 }


