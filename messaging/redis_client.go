package messaging

import (
	"log"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gomodule/redigo/redis"
)

const expireTime = 7 * 24 * time.Hour

type redisClient struct {
	pool *redis.Pool
}

func initRedisClient() *redisClient {
	pool := redis.NewPool(func() (conn redis.Conn, e error) {
		c, err := redis.Dial("tcp", ":6379")
		return c, err
	}, 3)

	return &redisClient{
		pool: pool,
	}
}

func (rc *redisClient) storeMessage(mess string) timeMessage {
	now := time.Now()
	ts := now.UnixNano()
	formatted := now.Format("06/01/02 15:04") + " " + mess

	c := rc.pool.Get()
	defer c.Close()
	_, _ = c.Do("SET", "message:"+strconv.FormatInt(ts, 10), formatted, "EX", int(expireTime.Seconds()))

	return timeMessage{
		message: formatted,
		ts:      ts,
	}
}

type timeMessage struct {
	message string
	ts      int64
}

func (rc *redisClient) getHistory() (timeMessages []timeMessage) {
	c := rc.pool.Get()
	defer c.Close()

	keys, err := redis.Values(c.Do("KEYS", "*"))
	if err != nil {
		log.Println("redis err keys", err)
		return
	}
	values, err := redis.Strings(c.Do("MGET", keys...))
	if err != nil {
		log.Println("redis err values", err)
		return
	}

	strKeys, _ := redis.Strings(keys, nil)

	for i, key := range strKeys {
		if !strings.Contains(key, ":") {
			continue
		}
		value := values[i]
		ts, _ := strconv.ParseInt(strings.Split(key, ":")[1], 10, 64)
		timeMessages = append(timeMessages, timeMessage{
			message: value,
			ts:      ts,
		})
	}

	sort.Slice(timeMessages, func(i, j int) bool {
		return timeMessages[i].ts < timeMessages[j].ts
	})

	return
}
