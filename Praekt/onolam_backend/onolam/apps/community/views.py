"""OnOlam — Community Views"""
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Channel, Post, Comment, ChatMessage, DirectMessage, ChannelView


def _get_new_count(channel, user):
    """Foydalanuvchi oxirgi ko'rishidan keyin yangi postlar soni"""
    view = ChannelView.objects.filter(user=user, channel=channel).first()
    if not view:
        return channel.posts.filter(is_active=True).count()
    return channel.posts.filter(is_active=True, created_at__gt=view.last_seen).count()


def _post_data(post, user):
    """Post ma'lumotlarini dict ga aylantirish"""
    return {
        'id':            post.id,
        'user': {
            'id':       post.user.id,
            'username': post.user.username,
            'name':     post.user.get_full_name() or post.user.username,
            'avatar':   post.user.avatar.url if post.user.avatar else None,
            'is_pro':   post.user.is_pro,
        },
        'content':       post.content,
        'post_type':     post.post_type,
        'like_count':    post.like_count,
        'comment_count': post.comment_count,
        'is_liked':      post.likes.filter(id=user.id).exists(),
        'is_pinned':     post.is_pinned,
        'is_own':        post.user.id == user.id,
        'created_at':    post.created_at.isoformat(),
        'image':         post.image.url if post.image else None,
        'video':         post.video.url if post.video else None,
        'file':          post.file.url if post.file else None,
        'file_name':     post.file_name or '',
        'link':          post.link or '',
    }


def _comment_data(comment, user):
    return {
        'id':         comment.id,
        'user': {
            'username': comment.user.username,
            'name':     comment.user.get_full_name() or comment.user.username,
            'avatar':   comment.user.avatar.url if comment.user.avatar else None,
            'is_pro':   comment.user.is_pro,
        },
        'content':    comment.content,
        'like_count': comment.likes.count(),
        'is_liked':   comment.likes.filter(id=user.id).exists(),
        'is_own':     comment.user.id == user.id,
        'created_at': comment.created_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def channel_list(request):
    """GET /api/v1/community/channels/"""
    channels = Channel.objects.filter(is_active=True)
    data = [{
        'id':          ch.id,
        'name':        ch.name,
        'slug':        ch.slug,
        'description': ch.description,
        'icon':        ch.icon,
        'post_count':  ch.posts.filter(is_active=True).count(),
        'new_count':   _get_new_count(ch, request.user),
    } for ch in channels]
    return Response({'channels': data})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def post_list(request):
    """GET /api/v1/community/posts/?channel=umumiy&page=1"""
    if not request.user.is_pro:
        return Response({'error': 'Pro tarifga o\'ting', 'upgrade_required': True}, status=403)

    channel_slug = request.query_params.get('channel', 'umumiy')
    page         = int(request.query_params.get('page', 1))
    query        = request.query_params.get('q', '').strip()
    per_page     = 20

    channel = Channel.objects.filter(slug=channel_slug).first()
    if not channel:
        return Response({'error': 'Kanal topilmadi'}, status=404)

    # Foydalanuvchi bu kanalga kirdi — last_seen yangilash
    ChannelView.objects.update_or_create(
        user=request.user, channel=channel,
        defaults={'last_seen': timezone.now()}
    )

    posts = Post.objects.filter(
        channel=channel, is_active=True
    ).select_related('user').prefetch_related('likes', 'comments')

    # Qidiruv
    if query:
        posts = posts.filter(content__icontains=query)

    total      = posts.count()
    start      = (page - 1) * per_page
    end        = start + per_page
    posts_page = posts[start:end]

    return Response({
        'channel': {
            'name':        channel.name,
            'slug':        channel.slug,
            'description': channel.description,
        },
        'posts':    [_post_data(p, request.user) for p in posts_page],
        'total':    total,
        'page':     page,
        'has_more': end < total,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def post_create(request):
    """POST /api/v1/community/posts/create/"""
    if not request.user.is_pro:
        return Response({'error': 'Pro tarifga o\'ting', 'upgrade_required': True}, status=403)

    content      = request.data.get('content', '').strip()
    channel_slug = request.data.get('channel', 'umumiy')
    post_type    = request.data.get('post_type', 'text')

    if not content:
        return Response({'error': 'Kontent bo\'sh bo\'lishi mumkin emas'}, status=400)
    if len(content) > 2000:
        return Response({'error': 'Kontent 2000 ta belgidan oshmasligi kerak'}, status=400)

    channel = get_object_or_404(Channel, slug=channel_slug)

    post = Post.objects.create(
        user      = request.user,
        channel   = channel,
        content   = content,
        post_type = post_type,
        link      = request.data.get('link', ''),
    )

    # Rasm yuklash
    if 'image' in request.FILES:
        post.image = request.FILES['image']
        post.save()

    # Video yuklash (max 50MB)
    if 'video' in request.FILES:
        video = request.FILES['video']
        if video.size > 50 * 1024 * 1024:
            post.delete()
            return Response({'error': 'Video 50MB dan oshmasligi kerak'}, status=400)
        post.video = video
        post.save()

    # Fayl yuklash
    ALLOWED = ['.pdf','.doc','.docx','.xls','.xlsx','.txt']
    if 'file' in request.FILES:
        f = request.FILES['file']
        import os
        ext = os.path.splitext(f.name)[1].lower()
        if ext not in ALLOWED:
            post.delete()
            return Response({'error': f'Fayl formati qabul qilinmaydi. Ruxsat etilganlar: {", ".join(ALLOWED)}'}, status=400)
        if f.size > 20 * 1024 * 1024:
            post.delete()
            return Response({'error': 'Fayl 20MB dan oshmasligi kerak'}, status=400)
        post.file      = f
        post.file_name = f.name
        post.save()

    return Response({
        'message': 'Post qo\'shildi!',
        'post':    _post_data(post, request.user),
    }, status=201)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def post_like(request, pk):
    """POST /api/v1/community/posts/<pk>/like/"""
    post = get_object_or_404(Post, pk=pk, is_active=True)

    if post.likes.filter(id=request.user.id).exists():
        post.likes.remove(request.user)
        liked = False
    else:
        post.likes.add(request.user)
        liked = True

    return Response({'liked': liked, 'like_count': post.like_count})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def post_delete(request, pk):
    """DELETE /api/v1/community/posts/<pk>/"""
    post = get_object_or_404(Post, pk=pk, user=request.user)
    post.is_active = False
    post.save()
    return Response({'message': 'Post o\'chirildi'})


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def comment_list_create(request, post_pk):
    """GET/POST /api/v1/community/posts/<pk>/comments/"""
    post = get_object_or_404(Post, pk=post_pk, is_active=True)

    if request.method == 'GET':
        comments = post.comments.filter(is_active=True).select_related('user')
        return Response({
            'comments': [_comment_data(c, request.user) for c in comments]
        })

    # POST
    content = request.data.get('content', '').strip()
    if not content:
        return Response({'error': 'Izoh bo\'sh bo\'lishi mumkin emas'}, status=400)
    if len(content) > 500:
        return Response({'error': 'Izoh 500 ta belgidan oshmasligi kerak'}, status=400)

    comment = Comment.objects.create(
        post    = post,
        user    = request.user,
        content = content,
    )

    return Response({
        'message': 'Izoh qo\'shildi!',
        'comment': _comment_data(comment, request.user),
    }, status=201)

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def chat_messages(request, channel_slug):
    """GET/POST /api/v1/community/chat/<channel_slug>/"""
    if not request.user.is_pro:
        return Response({'error': 'Pro tarifga o\'ting'}, status=403)

    channel = get_object_or_404(Channel, slug=channel_slug)

    if request.method == 'GET':
        msgs = channel.chat_messages.filter(
            is_active=True
        ).select_related('user')[:50]
        return Response({
            'messages': [{
                'id':         m.id,
                'user': {
                    'username': m.user.username,
                    'name':     m.user.get_full_name() or m.user.username,
                    'avatar':   m.user.avatar.url if m.user.avatar else None,
                    'is_pro':   m.user.is_pro,
                },
                'content':    m.content,
                'is_own':     m.user.id == request.user.id,
                'created_at': m.created_at.isoformat(),
            } for m in reversed(list(msgs))]
        })

    # POST
    content = request.data.get('content', '').strip()
    if not content:
        return Response({'error': 'Xabar bo\'sh'}, status=400)
    if len(content) > 500:
        return Response({'error': '500 belgidan oshmasin'}, status=400)

    msg = ChatMessage.objects.create(
        channel=channel,
        user=request.user,
        content=content,
    )
    return Response({
        'message': {
            'id':         msg.id,
            'user': {
                'username': msg.user.username,
                'name':     msg.user.get_full_name() or msg.user.username,
                'avatar':   msg.user.avatar.url if msg.user.avatar else None,
                'is_pro':   msg.user.is_pro,
            },
            'content':    msg.content,
            'is_own':     True,
            'created_at': msg.created_at.isoformat(),
        }
    }, status=201)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def post_edit(request, pk):
    """PATCH /api/v1/community/posts/<pk>/edit/"""
    post = get_object_or_404(Post, pk=pk, user=request.user, is_active=True)
    content = request.data.get('content', '').strip()
    if not content:
        return Response({'error': 'Kontent bo\'sh bo\'lishi mumkin emas'}, status=400)
    if len(content) > 2000:
        return Response({'error': '2000 belgidan oshmasin'}, status=400)
    post.content = content
    post.save()
    return Response({'message': 'Post yangilandi', 'post': _post_data(post, request.user)})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def chat_delete(request, pk):
    """DELETE /api/v1/community/chat/message/<pk>/"""
    msg = get_object_or_404(ChatMessage, pk=pk, user=request.user)
    msg.is_active = False
    msg.save()
    return Response({'message': 'Xabar o\'chirildi'})

# ── DIRECT MESSAGES ──

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dm_conversations(request):
    """GET /api/v1/community/dm/ — Barcha suhbatlar"""
    from django.db.models import Q, Max
    user = request.user

    # Foydalanuvchi ishtirok etgan barcha suhbatlar
    conversations = DirectMessage.objects.filter(
        Q(sender=user) | Q(receiver=user),
        is_active=True
    ).values(
        'sender__id', 'sender__username', 'sender__first_name', 'sender__last_name',
        'receiver__id', 'receiver__username', 'receiver__first_name', 'receiver__last_name',
    ).annotate(last_msg=Max('created_at')).order_by('-last_msg')

    # Noyob suhbatdoshlarni ajratish
    seen = set()
    result = []
    for c in conversations:
        if c['sender__id'] == user.id:
            other_id       = c['receiver__id']
            other_username = c['receiver__username']
            other_name     = (c['receiver__first_name'] or '') + ' ' + (c['receiver__last_name'] or '')
        else:
            other_id       = c['sender__id']
            other_username = c['sender__username']
            other_name     = (c['sender__first_name'] or '') + ' ' + (c['sender__last_name'] or '')

        if other_id in seen:
            continue
        seen.add(other_id)

        # Oxirgi xabar
        last = DirectMessage.objects.filter(
            Q(sender=user, receiver_id=other_id) |
            Q(sender_id=other_id, receiver=user),
            is_active=True
        ).order_by('-created_at').first()

        # O'qilmagan xabarlar
        unread = DirectMessage.objects.filter(
            sender_id=other_id, receiver=user,
            is_read=False, is_active=True
        ).count()

        result.append({
            'user_id':   other_id,
            'username':  other_username,
            'name':      other_name.strip() or other_username,
            'last_msg':  last.content[:50] if last else '',
            'unread':    unread,
            'time':      last.created_at.isoformat() if last else '',
        })

    return Response({'conversations': result})


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def dm_messages(request, user_id):
    """GET/POST /api/v1/community/dm/<user_id>/"""
    from django.db.models import Q
    from onolam.apps.accounts.models import User

    other = get_object_or_404(User, id=user_id)
    me    = request.user

    if request.method == 'GET':
        msgs = DirectMessage.objects.filter(
            Q(sender=me, receiver=other) |
            Q(sender=other, receiver=me),
            is_active=True
        ).order_by('created_at')

        # O'qilgan deb belgilash
        msgs.filter(sender=other, is_read=False).update(is_read=True)

        return Response({
            'other': {
                'id':       other.id,
                'username': other.username,
                'name':     other.get_full_name() or other.username,
                'avatar':   other.avatar.url if other.avatar else None,
                'is_pro':   other.is_pro,
            },
            'messages': [{
                'id':         m.id,
                'content':    m.content,
                'is_own':     m.sender_id == me.id,
                'is_read':    m.is_read,
                'created_at': m.created_at.isoformat(),
            } for m in msgs]
        })

    # POST
    content = request.data.get('content', '').strip()
    if not content:
        return Response({'error': 'Xabar bo\'sh'}, status=400)

    msg = DirectMessage.objects.create(
        sender=me, receiver=other, content=content
    )
    return Response({
        'message': {
            'id':         msg.id,
            'content':    msg.content,
            'is_own':     True,
            'is_read':    False,
            'created_at': msg.created_at.isoformat(),
        }
    }, status=201)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_search(request):
    """GET /api/v1/community/users/?q=username"""
    from onolam.apps.accounts.models import User
    q = request.query_params.get('q', '').strip()
    if len(q) < 2:
        return Response({'users': []})

    users = User.objects.filter(
        username__icontains=q, is_active=True
    ).exclude(id=request.user.id)[:10]

    return Response({'users': [{
        'id':       u.id,
        'username': u.username,
        'name':     u.get_full_name() or u.username,
        'avatar':   u.avatar.url if u.avatar else None,
        'is_pro':   u.is_pro,
    } for u in users]})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def sidebar_stats(request):
    """GET /api/v1/community/stats/"""
    from onolam.apps.accounts.models import User
    from django.utils import timezone
    from datetime import timedelta

    today = timezone.now().date()

    # Oxirgi 1 soat ichida faol bo'lgan userlar
    from datetime import timedelta
    one_hour_ago = timezone.now() - timedelta(hours=1)
    recent_users = User.objects.filter(
        is_active=True,
        last_activity__gte=one_hour_ago
    ).exclude(id=request.user.id).order_by('-last_activity')[:10]

    online_users = [{
        'id':         u.id,
        'username':   u.username,
        'name':       u.get_full_name() or u.username,
        'avatar':     u.avatar.url if u.avatar else None,
        'is_pro':     u.is_pro,
        'last_seen':  u.last_logout.isoformat() if u.last_logout else (u.last_activity.isoformat() if u.last_activity else None),
    } for u in recent_users]

    # Top a'zolar — eng ko'p post yozganlar
    from django.db.models import Count
    top_members = User.objects.filter(
        is_active=True
    ).annotate(
        post_count=Count('posts')
    ).order_by('-post_count')[:3]

    top = [{
        'id':         u.id,
        'username':   u.username,
        'name':       u.get_full_name() or u.username,
        'avatar':     u.avatar.url if u.avatar else None,
        'post_count': u.post_count,
        'is_pro':     u.is_pro,
    } for u in top_members]

    # Bugungi statistika
    today_posts    = Post.objects.filter(created_at__date=today, is_active=True).count()
    today_comments = Comment.objects.filter(created_at__date=today, is_active=True).count()
    today_projects = Post.objects.filter(created_at__date=today, post_type='project', is_active=True).count()
    new_members    = User.objects.filter(created_at__date=today).count()

    return Response({
        'online_users': online_users,
        'top_members':  top,
        'daily_stats': {
            'posts':      today_posts,
            'comments':   today_comments,
            'projects':   today_projects,
            'new_members': new_members,
        }
    })
