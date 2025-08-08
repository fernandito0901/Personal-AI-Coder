def add(a, b):
    # Broken on purpose; orchestrator should fix it by editing code in repo
    return a + b + 1


def test_add():
    assert add(2, 3) == 5