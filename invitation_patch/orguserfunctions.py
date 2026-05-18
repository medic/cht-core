from .utils import get_authorized_invitation

def resend_invitation(request, invitation_id):
    invitation, error_response = get_authorized_invitation(request, invitation_id)
    if error_response:
        return error_response

    invitation.send()
    return {"status": "success", "message": "Invitation resent successfully"}, 200
