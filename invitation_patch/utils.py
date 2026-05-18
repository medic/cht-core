from .models import Invitation, ObjectDoesNotExist

def get_authorized_invitation(request, invitation_id):
    if not request.user.has_perm('can_manage_invitations'):
        return None, ({"status": "error", "message": "Permission denied"}, 403)

    try:
        invitation = Invitation.objects.get(
            id=invitation_id,
            organization=request.user.organization
        )
        return invitation, None
    except ObjectDoesNotExist:
        return None, ({"status": "error", "message": "Invitation not found"}, 404)
