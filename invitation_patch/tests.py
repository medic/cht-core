import unittest
from .models import Invitation, Organization, User
from .orguserfunctions import resend_invitation
from .user_org_api import delete_invitation

STATUS_KEY = "status"
STATUS_SUCCESS = "success"
STATUS_ERROR = "error"

class MockRequest:
    def __init__(self, user):
        self.user = user

class InvitationSecurityTestCase(unittest.TestCase):
    def setUp(self):
        Invitation.objects.all_items.clear()

        self.org_a = Organization(id=1, name="Org A")
        self.org_b = Organization(id=2, name="Org B")

        self.user_a = User(id=101, username="admin_a", organization=self.org_a, has_perm=True)
        self.user_b = User(id=102, username="admin_b", organization=self.org_b, has_perm=True)
        self.unauth_user = User(id=103, username="staff_a", organization=self.org_a, has_perm=False)

        self.invite_a = Invitation.objects.create(id=1001, email="invitee_a@example.com", organization=self.org_a)
        self.invite_b = Invitation.objects.create(id=1002, email="invitee_b@example.com", organization=self.org_b)

    def test_same_org_resend_works(self):
        request = MockRequest(user=self.user_a)
        response, status_code = resend_invitation(request, self.invite_a.id)

        self.assertEqual(status_code, 200)
        self.assertEqual(response[STATUS_KEY], STATUS_SUCCESS)
        self.assertTrue(self.invite_a.is_sent)

    def test_same_org_delete_works(self):
        request = MockRequest(user=self.user_a)
        response, status_code = delete_invitation(request, self.invite_a.id)

        self.assertEqual(status_code, 200)
        self.assertEqual(response[STATUS_KEY], STATUS_SUCCESS)
        self.assertNotIn(self.invite_a, Invitation.objects.all_items)

    def test_cross_org_resend_blocked(self):
        request = MockRequest(user=self.user_a)
        response, status_code = resend_invitation(request, self.invite_b.id)

        self.assertEqual(status_code, 404)
        self.assertEqual(response[STATUS_KEY], STATUS_ERROR)
        self.assertFalse(self.invite_b.is_sent)

    def test_cross_org_delete_blocked(self):
        request = MockRequest(user=self.user_a)
        response, status_code = delete_invitation(request, self.invite_b.id)

        self.assertEqual(status_code, 404)
        self.assertEqual(response[STATUS_KEY], STATUS_ERROR)
        self.assertIn(self.invite_b, Invitation.objects.all_items)

    def test_unauthorized_user_fails(self):
        request = MockRequest(user=self.unauth_user)
        response, status_code = resend_invitation(request, self.invite_a.id)

        self.assertEqual(status_code, 403)
        self.assertEqual(response[STATUS_KEY], STATUS_ERROR)

        response, status_code = delete_invitation(request, self.invite_a.id)

        self.assertEqual(status_code, 403)
        self.assertEqual(response[STATUS_KEY], STATUS_ERROR)

if __name__ == "__main__":
    unittest.main()
