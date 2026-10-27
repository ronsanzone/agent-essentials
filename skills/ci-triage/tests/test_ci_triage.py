import importlib.machinery
import importlib.util
import os
import unittest

_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "ci-triage")
_loader = importlib.machinery.SourceFileLoader("ci_triage", _path)
_spec = importlib.util.spec_from_loader("ci_triage", _loader)
ct = importlib.util.module_from_spec(_spec)
_loader.exec_module(ct)

# Real lines from the 10gen/mms#193540 merge-queue failure (test log has print_time prefixes).
TEST_LOG = """\
[2026/10/26 15:07:40.526] ERROR: expected: <{"tag🙂":"🙂"}> but was: <{"tag\\ud83d\\ude42": "\\ud83d\\ude42"}> (org.opentest4j.AssertionFailedError)
[2026/10/26 15:07:40.526] org.opentest4j.AssertionFailedError: expected: <{"tag🙂":"🙂"}> but was: <{"tag\\ud83d\\ude42": "\\ud83d\\ude42"}>
[2026/10/26 15:07:40.526] \tat org.junit.jupiter.api.AssertionFailureBuilder.build(AssertionFailureBuilder.java:151)
[2026/10/26 15:07:40.526] \tat com.xgen.svc.nds.res.LifecycleManagementConfResourceUnitTests.configure_x(LifecycleManagementConfResourceUnitTests.java:553)
"""

TASK_LOG = """\
INFO Wrote the TSS answer for 1962 test ids to /data/mci/x/tss_quarantine_selection.json
reading test log spec; falling back to default spec: open /data/mci/x/build/TestLogs/log_spec.yaml: no such file
server/src/main/com/xgen/Foo.java:12: error: [NullAway] dereferenced expression bar is @Nullable
ConnectionResetError: [Errno 104] Connection reset by peer
Task completed - SUCCESS.
"""


class ResolveTest(unittest.TestCase):
    def test_targets(self):
        cases = {
            "https://github.com/10gen/mms/pull/193540": {"kind": "pr", "repo": "10gen/mms", "number": 193540},
            "10gen/mms#193540": {"kind": "pr", "repo": "10gen/mms", "number": 193540},
            "https://spruce.corp.mongodb.com/version/6adfcbeeb74d8500077cc245/tasks?variant=^unit_java$":
                {"kind": "version", "id": "6adfcbeeb74d8500077cc245"},
            "https://evergreen.mongodb.com/version/6adfea90346c2000079f5e93":
                {"kind": "version", "id": "6adfea90346c2000079f5e93"},
            "mms_a2c37b201a132576e070bdf067bca06b4fbc7a2c":
                {"kind": "version", "id": "mms_a2c37b201a132576e070bdf067bca06b4fbc7a2c"},
            "https://spruce.corp.mongodb.com/task/mms_unit_java_X_patch_0b28_6adf_26_10_26?execution=0":
                {"kind": "task", "id": "mms_unit_java_X_patch_0b28_6adf_26_10_26"},
        }
        for target, want in cases.items():
            self.assertEqual(want, ct.resolve(target, os.getcwd()), target)
        with self.assertRaises(ct.Fail):
            ct.resolve("not-a-target", os.getcwd())


class ExcerptTest(unittest.TestCase):
    def test_test_log_keeps_assertion_and_first_xgen_frame(self):
        lines = ct.test_excerpt(TEST_LOG)
        self.assertTrue(lines[0].startswith('ERROR: expected: <{"tag🙂":"🙂"}>'), lines)
        self.assertEqual(
            "at com.xgen.svc.nds.res.LifecycleManagementConfResourceUnitTests.configure_x"
            "(LifecycleManagementConfResourceUnitTests.java:553)", lines[-1])
        self.assertFalse(any("AssertionFailureBuilder" in l for l in lines))

    def test_task_log_drops_tss_noise(self):
        lines = ct.excerpt(TASK_LOG, ct.COMPILE_LINE_RE, 15)
        self.assertEqual(["server/src/main/com/xgen/Foo.java:12: error: [NullAway] dereferenced expression bar is @Nullable",
                          "ConnectionResetError: [Errno 104] Connection reset by peer"], lines)


class PatchPlanTest(unittest.TestCase):
    def test_plans(self):
        self.assertEqual(
            {"variant": "int", "task": "GENERATE_INT_TESTS_BAZEL_COMBINED", "narrowed": True, "task_def": "atm",
             "params": ["int_use_rbe=false", "task_def_names=atm"]},
            ct.patch_plan("INT_JAVA_ATM", "int", "GENERATE_INT_TESTS_BAZEL_COMBINED"))
        self.assertEqual(
            {"variant": "unit_java", "task": "GENERATE_UNIT_TESTS_BAZEL_RBE", "narrowed": False, "params": []},
            ct.patch_plan("UNIT_JAVA_NDS_API_UI", "unit_java", "GENERATE_UNIT_TESTS_BAZEL_RBE"))
        self.assertEqual(
            {"variant": "code_health", "task": "COMPILE_BAZEL", "narrowed": True, "params": []},
            ct.patch_plan("COMPILE_BAZEL", "code_health", None))


if __name__ == "__main__":
    unittest.main()
