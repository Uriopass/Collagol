module Websocket where

import           Control.Concurrent                       ( forkIO
                                                          , threadDelay
                                                          )
import           Control.Exception                        ( SomeException
                                                          , finally
                                                          , handle
                                                          )
import           Control.Monad                            ( forever )
import           Control.Monad.Trans                      ( MonadIO )
import qualified Data.ByteString.Char8         as BS
import           Data.CaseInsensitive                     ( mk )
import qualified Data.Map                      as Map
import           Happstack.Server                         ( ServerMonad
                                                          , Headers
                                                          , askRq
                                                          , Request(..)
                                                          , HeaderPair(..)
                                                          )
import           Happstack.Server.Internal.Monads         ( escapeHTTP )
import           Happstack.Server.Internal.TimeoutIO      ( TimeoutIO(..) )

import qualified Network.WebSockets            as WS
import qualified Network.WebSockets.Connection as WS
import qualified Network.WebSockets.Stream     as WS
import           Network.WebSockets.Connection            ( connectionCompressionOptions )


runWebSocketsHappstackWith :: (ServerMonad m, MonadIO m) => WS.ConnectionOptions -> WS.ServerApp -> m a
runWebSocketsHappstackWith = runWebSocketsHappstackDelayWith 25 -- keepalive every 25 seconds, can be changed in case timeout for TimeoutIO is not 30 seconds

runWebSocketsHappstackDelayWith :: (ServerMonad m, MonadIO m) => Int -> WS.ConnectionOptions -> WS.ServerApp -> m a
runWebSocketsHappstackDelayWith keepAlive options app = do
  req <- askRq
  escapeHTTP $ \timeoutIO -> do
    stream <- WS.makeStream (toGet timeoutIO) (maybe (pure ()) (toPutLazy timeoutIO))
    let pc = WS.PendingConnection { WS.pendingOptions  = options
                                  , WS.pendingRequest  = mkRequestHead req
                                  , WS.pendingOnAccept = forkPingThread keepAlive
                                  , WS.pendingStream   = stream
                                  }
    app pc `finally` WS.close stream
 where
  mkHeaders :: Headers -> WS.Headers
  mkHeaders headers = foldr (\(HeaderPair k vs) l -> [ (mk k, v) | v <- vs ] ++ l) [] (Map.elems headers)
  mkRequestHead :: Request -> WS.RequestHead
  mkRequestHead req = WS.RequestHead { WS.requestPath    = BS.pack (rqUri req)
                                     , WS.requestHeaders = mkHeaders (rqHeaders req)
                                     , WS.requestSecure  = rqSecure req
                                     }

-- | a ping thread to keep the connection alive on some browsers
forkPingThread :: Int -> WS.Connection -> IO ()
forkPingThread keepAlive connection = do
  _ <- forkIO pingThread
  pure ()
 where
  pingThread :: IO ()
  pingThread = handle ignoreAll $ forever $ do
    WS.sendPing connection (BS.pack "ping")
    threadDelay (keepAlive * 10 ^ 6)

  ignoreAll :: SomeException -> IO ()
  ignoreAll _ = pure ()

runWebSocketsHappstack :: (ServerMonad m, MonadIO m) => WS.ServerApp -> m a
runWebSocketsHappstack = runWebSocketsHappstackWith
  (WS.defaultConnectionOptions
    { connectionCompressionOptions = WS.PermessageDeflateCompression WS.defaultPermessageDeflate
    }
  )
