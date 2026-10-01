import json
import unittest
from pathlib import Path
from modelsheet_cli.categories import model_category
from modelsheet_cli.filters import skip_reason
from modelsheet_cli.exporter import merge_model


class DecisionCatalogTests(unittest.TestCase):
    def test_reviewed_encoder_families_pass_filters_without_opening_generic_classifiers(self):
        for mid in ['convaiinnovations/laya', 'fastino/GLiNER2.5-multi-Decide', 'internlm/Intern-Decision-4B']:
            self.assertEqual(model_category(mid), 'decision')
            self.assertIsNone(skip_reason(mid, pipeline_tag='text-classification', model_type='bert'))
        self.assertIsNotNone(skip_reason('other/classifier', pipeline_tag='text-classification'))
        self.assertIsNotNone(skip_reason('internlm/Intern-Decision-4B-GGUF', pipeline_tag='text-classification'))

    def test_refresh_retains_reviewed_facts_and_decision_metadata(self):
        merged=merge_model({'id':'a/b','totalParameters':42,'curatedFields':['totalParameters'], 'decisionTypes':['choice'], 'baseModel':'c/d'}, {'id':'a/b','totalParameters':30})
        self.assertEqual(merged['totalParameters'],42)
        self.assertEqual(merged['decisionTypes'],['choice'])
        self.assertEqual(merged['baseModel'],'c/d')

    def test_current_catalog_has_unique_identity_and_sourced_decision_models(self):
        models=json.loads((Path(__file__).parents[1]/'data/models.json').read_text(encoding='utf-8'))
        self.assertEqual(len(models), len({m['id'] for m in models}))
        decisions=[m for m in models if m.get('modelCategory')=='decision']
        self.assertGreaterEqual(len(decisions),12)
        for m in decisions:
            self.assertTrue(m.get('sourceUrl'),m['id'])
            self.assertTrue(m.get('decisionTypes'),m['id'])
            self.assertIn(m['inferenceMode'],['single-forward','contrastive','api'])
            if m['openness']=='closed':self.assertIsNone(m.get('totalParameters'))
