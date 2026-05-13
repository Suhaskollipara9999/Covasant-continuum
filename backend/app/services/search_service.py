"""
Covasant Continuum — Elasticsearch Service
Full-text + semantic hybrid search with index management.
"""

from typing import Any
from uuid import UUID

from app.core.config import get_settings

settings = get_settings()


class SearchService:
    """Elasticsearch integration for full-text and semantic search."""

    def __init__(self):
        self._client = None

    async def _get_client(self):
        if self._client is None:
            try:
                import httpx
                self._client = httpx.AsyncClient(base_url=settings.ELASTICSEARCH_URL, timeout=10.0)
            except Exception:
                self._client = None
        return self._client

    # ── Index Management ──

    async def create_index(self) -> bool:
        """Create the artefacts index with proper mappings."""
        client = await self._get_client()
        if not client:
            return False

        mapping = {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "analysis": {
                    "analyzer": {
                        "continuum_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": ["lowercase", "stop", "snowball"],
                        }
                    }
                },
            },
            "mappings": {
                "properties": {
                    "title": {"type": "text", "analyzer": "continuum_analyzer", "boost": 3.0},
                    "description": {"type": "text", "analyzer": "continuum_analyzer", "boost": 2.0},
                    "content": {"type": "text", "analyzer": "continuum_analyzer"},
                    "product": {"type": "keyword"},
                    "artefact_type": {"type": "keyword"},
                    "visibility": {"type": "keyword"},
                    "status": {"type": "keyword"},
                    "version": {"type": "keyword"},
                    "tags": {"type": "keyword"},
                    "uploaded_by": {"type": "keyword"},
                    "tenant_ids": {"type": "keyword"},
                    "file_name": {"type": "text"},
                    "created_at": {"type": "date"},
                    "published_at": {"type": "date"},
                    "view_count": {"type": "integer"},
                    "download_count": {"type": "integer"},
                },
            },
        }

        try:
            resp = await client.put("/continuum_artefacts", json=mapping)
            return resp.status_code in (200, 201)
        except Exception:
            return False

    async def delete_index(self) -> bool:
        client = await self._get_client()
        if not client:
            return False
        try:
            resp = await client.delete("/continuum_artefacts")
            return resp.status_code == 200
        except Exception:
            return False

    # ── Document Indexing ──

    async def index_artefact(self, artefact_id: str, doc: dict[str, Any]) -> bool:
        """Index or update an artefact in Elasticsearch."""
        client = await self._get_client()
        if not client:
            return False
        try:
            resp = await client.put(f"/continuum_artefacts/_doc/{artefact_id}", json=doc)
            return resp.status_code in (200, 201)
        except Exception:
            return False

    async def remove_artefact(self, artefact_id: str) -> bool:
        """Remove an artefact from the index."""
        client = await self._get_client()
        if not client:
            return False
        try:
            resp = await client.delete(f"/continuum_artefacts/_doc/{artefact_id}")
            return resp.status_code == 200
        except Exception:
            return False

    async def bulk_index(self, documents: list[dict[str, Any]]) -> int:
        """Bulk index multiple artefacts. Returns count of indexed docs."""
        client = await self._get_client()
        if not client:
            return 0
        try:
            body_lines = []
            for doc in documents:
                doc_id = doc.pop("_id", None)
                body_lines.append(f'{{"index": {{"_index": "continuum_artefacts", "_id": "{doc_id}"}}}}')
                import json
                body_lines.append(json.dumps(doc))
            body = "\n".join(body_lines) + "\n"

            resp = await client.post("/_bulk", content=body, headers={"Content-Type": "application/x-ndjson"})
            if resp.status_code == 200:
                data = resp.json()
                return len([item for item in data.get("items", []) if item.get("index", {}).get("status") in (200, 201)])
            return 0
        except Exception:
            return 0

    # ── Search ──

    async def search(
        self,
        query: str,
        product: str | None = None,
        artefact_type: str | None = None,
        visibility: str | None = None,
        tenant_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        """Full-text search with filters and tenant isolation."""
        client = await self._get_client()
        if not client:
            return {"items": [], "total": 0}

        must = []
        filter_clauses = []

        # Full-text query
        if query:
            must.append({
                "multi_match": {
                    "query": query,
                    "fields": ["title^3", "description^2", "content", "tags^1.5", "file_name"],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                }
            })
        else:
            must.append({"match_all": {}})

        # Filters
        filter_clauses.append({"term": {"status": "published"}})
        if product:
            filter_clauses.append({"term": {"product": product}})
        if artefact_type:
            filter_clauses.append({"term": {"artefact_type": artefact_type}})
        if visibility:
            filter_clauses.append({"term": {"visibility": visibility}})
        if tenant_id:
            filter_clauses.append({
                "bool": {
                    "should": [
                        {"term": {"tenant_ids": tenant_id}},
                        {"bool": {"must_not": {"exists": {"field": "tenant_ids"}}}},
                    ]
                }
            })

        body = {
            "query": {
                "bool": {
                    "must": must,
                    "filter": filter_clauses,
                }
            },
            "from": (page - 1) * page_size,
            "size": page_size,
            "sort": [{"_score": "desc"}, {"created_at": "desc"}],
            "highlight": {
                "fields": {
                    "title": {},
                    "description": {},
                    "content": {"fragment_size": 150, "number_of_fragments": 2},
                }
            },
        }

        try:
            resp = await client.post("/continuum_artefacts/_search", json=body)
            if resp.status_code != 200:
                return {"items": [], "total": 0}

            data = resp.json()
            hits = data.get("hits", {})
            total = hits.get("total", {}).get("value", 0)
            items = []
            for hit in hits.get("hits", []):
                item = hit["_source"]
                item["_id"] = hit["_id"]
                item["_score"] = hit["_score"]
                item["_highlights"] = hit.get("highlight", {})
                items.append(item)

            return {"items": items, "total": total, "page": page, "page_size": page_size}
        except Exception:
            return {"items": [], "total": 0}

    async def health_check(self) -> bool:
        """Check if Elasticsearch is available."""
        client = await self._get_client()
        if not client:
            return False
        try:
            resp = await client.get("/_cluster/health")
            return resp.status_code == 200
        except Exception:
            return False


# Singleton
search_service = SearchService()
