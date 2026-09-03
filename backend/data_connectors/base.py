import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from backend.utils.logger import logger

class BaseDataConnector(ABC):
    """
    Abstract Base Data Connector with built-in caching, timeouts, and metadata provenance.
    """
    def __init__(self, name: str, source_id: str, ttl_seconds: int = 1800):
        self.name = name
        self.source_id = source_id
        self.ttl_seconds = ttl_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _get_cache_key(self, **kwargs) -> str:
        return f"{self.source_id}:" + ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))

    def get_from_cache(self, cache_key: str) -> Optional[Any]:
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if time.time() - entry["timestamp"] < self.ttl_seconds:
                return entry["data"]
            else:
                del self._cache[cache_key]
        return None

    def set_cache(self, cache_key: str, data: Any):
        self._cache[cache_key] = {
            "timestamp": time.time(),
            "data": data
        }

    @abstractmethod
    def fetch_data(self, **kwargs) -> Dict[str, Any]:
        """Fetch raw domain data from remote API or data store."""
        pass
