package main

import (
	"sync"
)

const maxPerIP = 5

type banner struct {
	IPs map[string][]int
	mu  sync.RWMutex
}

func initBanner() *banner {
	return &banner{
		IPs: make(map[string][]int),
	}
}

// register adds a connection for ip. If the ip already has maxPerIP
// connections, the oldest one is removed and its id returned.
func (b *banner) register(ip string, id int) (int, bool) {
	b.mu.Lock()
	defer b.mu.Unlock()

	ids := b.IPs[ip]
	var removed int
	var replaced bool
	if len(ids) >= maxPerIP {
		removed = ids[0]
		ids = ids[1:]
		replaced = true
	}
	ids = append(ids, id)
	b.IPs[ip] = ids
	return removed, replaced
}

// disconnect removes the given id from ip connection list.
func (b *banner) disconnect(ip string, id int) {
	b.mu.Lock()
	ids := b.IPs[ip]
	for i, v := range ids {
		if v == id {
			ids = append(ids[:i], ids[i+1:]...)
			break
		}
	}
	if len(ids) == 0 {
		delete(b.IPs, ip)
	} else {
		b.IPs[ip] = ids
	}
	b.mu.Unlock()
}

// overLimit returns the id of a connection to drop if ip already has
// maxPerIP connections. The returned bool indicates whether a connection
// should be removed.
func (b *banner) overLimit(ip string) (int, bool) {
	b.mu.RLock()
	ids := b.IPs[ip]
	b.mu.RUnlock()
	if len(ids) >= maxPerIP {
		return ids[0], true
	}
	return 0, false
}
