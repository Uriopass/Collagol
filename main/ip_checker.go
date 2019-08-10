package main

import (
	"sync"
)

type banner struct {
	IPs map[string]int
	mu  sync.RWMutex
}

func initBanner() *banner {
	return &banner{
		IPs: make(map[string]int),
	}
}

func (b *banner) register(ip string, id int) {
	b.mu.Lock()
	b.IPs[ip] = id
	b.mu.Unlock()
}

func (b *banner) disconnect(ip string) {
	b.mu.Lock()
	delete(b.IPs, ip)
	b.mu.Unlock()
}

func (b *banner) isConnected(ip string) (int, bool) {
	b.mu.RLock()
	v, ok := b.IPs[ip]
	b.mu.RUnlock()
	return v, ok
}
