"""
File watcher for automatic data reload
"""

import time
import os
from pathlib import Path
from datetime import datetime
import threading

class FileWatcher:
    def __init__(self, watch_path, callback, interval=5):
        self.watch_path = Path(watch_path)
        self.callback = callback
        self.interval = interval
        self.last_modified = {}
        self.running = False
        self.thread = None
        
    def get_file_stats(self):
        """Get modification times for all files in watch directory"""
        stats = {}
        if self.watch_path.exists():
            for file_path in self.watch_path.glob('*'):
                if file_path.is_file():
                    stats[str(file_path)] = file_path.stat().st_mtime
        return stats
    
    def check_changes(self):
        """Check if any files have been modified"""
        current_stats = self.get_file_stats()
        
        # Check for new or modified files
        for file_path, mtime in current_stats.items():
            if file_path not in self.last_modified or self.last_modified[file_path] != mtime:
                print(f"[FileWatcher] Detected change in: {Path(file_path).name}")
                self.last_modified = current_stats
                return True
                
        # Check for deleted files
        for file_path in list(self.last_modified.keys()):
            if file_path not in current_stats:
                print(f"[FileWatcher] Detected deletion of: {Path(file_path).name}")
                self.last_modified = current_stats
                return True
                
        return False
    
    def watch_loop(self):
        """Main watch loop"""
        print(f"[FileWatcher] Starting to watch: {self.watch_path}")
        self.last_modified = self.get_file_stats()
        
        while self.running:
            if self.check_changes():
                print(f"[FileWatcher] Triggering reload at {datetime.now()}")
                self.callback()
            time.sleep(self.interval)
    
    def start(self):
        """Start watching in a separate thread"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self.watch_loop, daemon=True)
            self.thread.start()
    
    def stop(self):
        """Stop watching"""
        self.running = False
        if self.thread:
            self.thread.join()