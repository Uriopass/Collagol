package main

import (
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
	ts := time.Now().UnixNano()

	c := rc.pool.Get()
	defer c.Close()
	_, _ = c.Do("SET", "message:"+strconv.FormatInt(ts, 10), mess, "EX", int(expireTime.Seconds()))

	return timeMessage{
		message: mess,
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

	keys, err := redis.Values(c.Do("keys *"))
	if err != nil {
		return
	}
	values, err := redis.Strings(c.Do("MGET", keys...))
	if err != nil {
		return
	}

	strKeys, _ := redis.Strings(keys, nil)

	for i, key := range strKeys {
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
