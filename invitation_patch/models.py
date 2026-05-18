class ObjectDoesNotExist(Exception):
    pass

class MockQuerySet:
    def __init__(self, model_class, items):
        self.model_class = model_class
        self.items = items

    def filter(self, **kwargs):
        filtered_items = [
            item for item in self.items
            if all(getattr(item, k, None) == v for k, v in kwargs.items())
        ]
        return MockQuerySet(self.model_class, filtered_items)

    def get(self, **kwargs):
        res = self.filter(**kwargs).items
        if not res:
            raise ObjectDoesNotExist(f"{self.model_class.__name__} matching query does not exist.")
        if len(res) > 1:
            raise ValueError(f"Multiple {self.model_class.__name__} returned.")
        return res[0]

class MockManager:
    def __init__(self, model_class):
        self.model_class = model_class
        self.all_items = []

    def get_queryset(self):
        return MockQuerySet(self.model_class, self.all_items)

    def filter(self, **kwargs):
        return self.get_queryset().filter(**kwargs)

    def get(self, **kwargs):
        return self.get_queryset().get(**kwargs)

    def create(self, **kwargs):
        item = self.model_class(**kwargs)
        self.all_items.append(item)
        return item

class Organization:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.name = kwargs.get('name')

class User:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.username = kwargs.get('username')
        self.organization = kwargs.get('organization')
        self._has_perm = kwargs.get('has_perm', True)

    def has_perm(self, perm_slug):
        if perm_slug:
            return self._has_perm
        return False

class Invitation:
    objects = None

    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.email = kwargs.get('email')
        self.organization = kwargs.get('organization')
        self.status = kwargs.get('status', 'pending')
        self.is_sent = False

    def send(self):
        self.is_sent = True

    def delete(self):
        if self in Invitation.objects.all_items:
            Invitation.objects.all_items.remove(self)

Invitation.objects = MockManager(Invitation)
