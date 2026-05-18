from .utils import get_authorized_invitation

def delete_invitation(request, invitation_id):
    invitation, error_response = get_authorized_invitation(request, invitation_id)
    if error_response:
        return error_response

    invitation.delete()
    return {"status": "success", "message": "Invitation deleted successfully"}, 200
