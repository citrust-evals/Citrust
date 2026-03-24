import asyncio
from app.models.evaluation_schemas import CampaignCreate, EvaluationType, ModelConfig, CampaignStatus
from app.core.database import mongodb

async def run():
    try:
        await mongodb.connect()
        c = CampaignCreate(
            name="Test",
            evaluation_type=EvaluationType.MULTI_MODEL,
            test_set_id="123",
            model_configs=[ModelConfig(model_name="test")]
        )
        d = c.model_dump()
        d["status"] = CampaignStatus.DRAFT.value
        d["id"] = "123"
        print("Dict:", d)
        await mongodb.evaluation_campaigns.insert_one(d)
        print("Success!")
    except Exception as e:
        print("Error:", type(e), e)

asyncio.run(run())
